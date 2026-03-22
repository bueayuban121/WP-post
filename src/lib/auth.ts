import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createHash, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { getPrismaClient } from "@/lib/prisma";
import { AccountStatus, UserRole, type User } from "@/generated/prisma/client";

const SESSION_COOKIE = "apc_session";
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 7;

export type AppUserSession = {
  id: string;
  email: string;
  name: string;
  role: "admin" | "client";
  status: "active" | "expired" | "suspended";
  clientId: string | null;
  clientName: string | null;
  contractStart: string | null;
  contractEnd: string | null;
};

type StoredUser = User & {
  client: {
    id: string;
    name: string;
  } | null;
};

function normalizeRole(role: UserRole) {
  return role === UserRole.ADMIN ? "admin" : "client";
}

function normalizeStatus(status: AccountStatus) {
  if (status === AccountStatus.SUSPENDED) {
    return "suspended";
  }

  if (status === AccountStatus.EXPIRED) {
    return "expired";
  }

  return "active";
}

function hashSessionToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const derived = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${derived}`;
}

export function verifyPassword(password: string, passwordHash: string | null) {
  if (!passwordHash) {
    return false;
  }

  const [salt, expected] = passwordHash.split(":");
  if (!salt || !expected) {
    return false;
  }

  const actual = scryptSync(password, salt, 64);
  const expectedBuffer = Buffer.from(expected, "hex");

  if (actual.length !== expectedBuffer.length) {
    return false;
  }

  return timingSafeEqual(actual, expectedBuffer);
}

function isUserExpired(user: StoredUser) {
  if (user.role === UserRole.ADMIN) {
    return false;
  }

  if (user.status === AccountStatus.SUSPENDED || user.status === AccountStatus.EXPIRED) {
    return true;
  }

  if (user.contractEnd && user.contractEnd.getTime() < Date.now()) {
    return true;
  }

  return false;
}

function toAppSession(user: StoredUser): AppUserSession {
  return {
    id: user.id,
    email: user.email,
    name: user.name ?? user.email,
    role: normalizeRole(user.role),
    status: isUserExpired(user) ? "expired" : normalizeStatus(user.status),
    clientId: user.clientId ?? null,
    clientName: user.client?.name ?? null,
    contractStart: user.contractStart?.toISOString() ?? null,
    contractEnd: user.contractEnd?.toISOString() ?? null
  };
}

export async function ensureBootstrapAdmin(email?: string, password?: string) {
  const prisma = getPrismaClient();
  if (!prisma) {
    return null;
  }

  const userCount = await prisma.user.count();
  if (userCount > 0) {
    return null;
  }

  const adminEmail = email?.trim() || process.env.APP_ADMIN_EMAIL?.trim();
  const adminPassword = password?.trim() || process.env.APP_ADMIN_PASSWORD?.trim();

  if (!adminEmail || !adminPassword) {
    return null;
  }

  const created = await prisma.user.create({
    data: {
      email: adminEmail.toLowerCase(),
      name: adminEmail.split("@")[0],
      passwordHash: hashPassword(adminPassword),
      role: UserRole.ADMIN,
      status: AccountStatus.ACTIVE
    },
    include: {
      client: true
    }
  });

  return toAppSession(created);
}

export async function getBootstrapState() {
  const prisma = getPrismaClient();
  if (!prisma) {
    return { requiresSetup: false };
  }

  const userCount = await prisma.user.count();
  return { requiresSetup: userCount === 0 };
}

async function findSessionUser(token: string) {
  const prisma = getPrismaClient();
  if (!prisma) {
    return null;
  }

  const session = await prisma.authSession.findUnique({
    where: {
      tokenHash: hashSessionToken(token)
    },
    include: {
      user: {
        include: {
          client: true
        }
      }
    }
  });

  if (!session) {
    return null;
  }

  if (session.expiresAt.getTime() < Date.now()) {
    await prisma.authSession.delete({ where: { id: session.id } }).catch(() => undefined);
    return null;
  }

  if (isUserExpired(session.user)) {
    return null;
  }

  return {
    sessionId: session.id,
    user: toAppSession(session.user)
  };
}

export async function createUserSession(userId: string) {
  const prisma = getPrismaClient();
  if (!prisma) {
    throw new Error("Database is required for authentication.");
  }

  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);

  await prisma.authSession.create({
    data: {
      userId,
      tokenHash: hashSessionToken(token),
      expiresAt
    }
  });

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt
  });
}

export async function clearCurrentSession() {
  const prisma = getPrismaClient();
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;

  if (token && prisma) {
    await prisma.authSession
      .deleteMany({
        where: {
          tokenHash: hashSessionToken(token)
        }
      })
      .catch(() => undefined);
  }

  cookieStore.set(SESSION_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: new Date(0)
  });
}

export async function getCurrentSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;

  if (!token) {
    return null;
  }

  return findSessionUser(token);
}

export async function authenticateUser(email: string, password: string) {
  const prisma = getPrismaClient();
  if (!prisma) {
    throw new Error("Database is required for authentication.");
  }

  await ensureBootstrapAdmin(email, password);

  const user = await prisma.user.findUnique({
    where: {
      email: email.trim().toLowerCase()
    },
    include: {
      client: true
    }
  });

  if (!user || !verifyPassword(password, user.passwordHash)) {
    return { ok: false as const, reason: "invalid" };
  }

  if (isUserExpired(user)) {
    return { ok: false as const, reason: "expired" };
  }

  await createUserSession(user.id);
  return { ok: true as const, user: toAppSession(user) };
}

export async function requirePageSession(options?: { adminOnly?: boolean }) {
  const session = await getCurrentSession();

  if (!session) {
    redirect("/login");
  }

  if (options?.adminOnly && session.user.role !== "admin") {
    redirect("/dashboard");
  }

  return session.user;
}

export async function requireRouteSession(options?: { adminOnly?: boolean }) {
  const session = await getCurrentSession();

  if (!session) {
    return { ok: false as const, status: 401, error: "Unauthorized." };
  }

  if (options?.adminOnly && session.user.role !== "admin") {
    return { ok: false as const, status: 403, error: "Admin access required." };
  }

  return { ok: true as const, user: session.user };
}

export function getJobScopeForUser(user: AppUserSession) {
  if (user.role === "admin") {
    return {};
  }

  return {
    clientId: user.clientId ?? undefined
  };
}

export async function listManagedUsers() {
  const prisma = getPrismaClient();
  if (!prisma) {
    return [];
  }

  const users = await prisma.user.findMany({
    include: {
      client: true
    },
    orderBy: [
      { role: "asc" },
      { createdAt: "desc" }
    ]
  });

  return users.map(toAppSession);
}

export async function createClientUser(input: {
  email: string;
  name: string;
  password: string;
  clientName: string;
  contractStart?: string;
  contractEnd?: string;
  status?: "active" | "expired" | "suspended";
}) {
  const prisma = getPrismaClient();
  if (!prisma) {
    throw new Error("Database is required for authentication.");
  }

  const email = input.email.trim().toLowerCase();
  const password = input.password.trim();
  const clientName = input.clientName.trim();

  if (!email || !password || !clientName) {
    throw new Error("Email, password, and client name are required.");
  }

  const status =
    input.status === "suspended"
      ? AccountStatus.SUSPENDED
      : input.status === "expired"
        ? AccountStatus.EXPIRED
        : AccountStatus.ACTIVE;

  const created = await prisma.user.create({
    data: {
      email,
      name: input.name.trim() || email.split("@")[0],
      passwordHash: hashPassword(password),
      role: UserRole.CLIENT,
      status,
      contractStart: input.contractStart ? new Date(input.contractStart) : null,
      contractEnd: input.contractEnd ? new Date(input.contractEnd) : null,
      client: {
        connectOrCreate: {
          where: { name: clientName },
          create: { name: clientName }
        }
      }
    },
    include: {
      client: true
    }
  });

  return toAppSession(created);
}

export async function updateManagedUser(
  userId: string,
  input: {
    status?: "active" | "expired" | "suspended";
    contractStart?: string | null;
    contractEnd?: string | null;
    password?: string;
  }
) {
  const prisma = getPrismaClient();
  if (!prisma) {
    throw new Error("Database is required for authentication.");
  }

  const updated = await prisma.user.update({
    where: { id: userId },
    data: {
      ...(input.status
        ? {
            status:
              input.status === "suspended"
                ? AccountStatus.SUSPENDED
                : input.status === "expired"
                  ? AccountStatus.EXPIRED
                  : AccountStatus.ACTIVE
          }
        : {}),
      ...(input.contractStart !== undefined
        ? {
            contractStart: input.contractStart ? new Date(input.contractStart) : null
          }
        : {}),
      ...(input.contractEnd !== undefined
        ? {
            contractEnd: input.contractEnd ? new Date(input.contractEnd) : null
          }
        : {}),
      ...(input.password?.trim()
        ? {
            passwordHash: hashPassword(input.password.trim())
          }
        : {})
    },
    include: {
      client: true
    }
  });

  return toAppSession(updated);
}
