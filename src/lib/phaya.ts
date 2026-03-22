type GeneratePhayaImageInput = {
  prompt: string;
  width?: number;
  height?: number;
};

type GeneratedPhayaImage = {
  src: string;
  provider: "phaya";
  jobId?: string;
};

const DEFAULT_BASE_URL = "https://api.phaya.io/api/v1";

function getEnv(name: string) {
  return process.env[name]?.trim() || "";
}

function getBaseUrl() {
  return getEnv("PHAYA_BASE_URL") || DEFAULT_BASE_URL;
}

function getApiKey() {
  return getEnv("PHAYA_API_KEY");
}

function getCreatePath() {
  return getEnv("PHAYA_TEXT_TO_IMAGE_PATH") || "/text-to-image/generate";
}

function getJobPath(jobId: string) {
  const template = getEnv("PHAYA_JOB_PATH_TEMPLATE") || "/text-to-image/status/{id}";
  return template.replace("{id}", jobId);
}

function inferAspectRatio(width: number, height: number) {
  const ratio = width / height;

  if (Math.abs(ratio - 1) < 0.08) {
    return "1:1";
  }

  if (Math.abs(ratio - 4 / 3) < 0.08) {
    return "4:3";
  }

  if (Math.abs(ratio - 3 / 4) < 0.08) {
    return "3:4";
  }

  if (Math.abs(ratio - 16 / 9) < 0.08) {
    return "16:9";
  }

  if (Math.abs(ratio - 9 / 16) < 0.08) {
    return "9:16";
  }

  return ratio >= 1 ? "16:9" : "3:4";
}

function joinUrl(base: string, path: string) {
  return `${base.replace(/\/$/, "")}/${path.replace(/^\//, "")}`;
}

function getString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function findFirstString(value: unknown, keys: string[]): string | undefined {
  if (!value || typeof value !== "object") {
    return undefined;
  }

  const record = value as Record<string, unknown>;
  for (const key of keys) {
    const found = getString(record[key]);
    if (found) {
      return found;
    }
  }

  return undefined;
}

function extractImageUrl(payload: unknown): string | undefined {
  return (
    findFirstString(payload, ["image_url", "imageUrl", "url", "output_url", "result_url"]) ||
    findFirstString((payload as Record<string, unknown> | undefined)?.data, [
      "image_url",
      "imageUrl",
      "url",
      "output_url",
      "result_url"
    ]) ||
    findFirstString((payload as Record<string, unknown> | undefined)?.result, [
      "image_url",
      "imageUrl",
      "url",
      "output_url",
      "result_url"
    ])
  );
}

function extractJobId(payload: unknown): string | undefined {
  return (
    findFirstString(payload, ["job_id", "jobId", "id", "task_id", "taskId"]) ||
    findFirstString((payload as Record<string, unknown> | undefined)?.data, [
      "job_id",
      "jobId",
      "id",
      "task_id",
      "taskId"
    ])
  );
}

async function parseResponse(response: Response) {
  const raw = await response.text();
  try {
    return raw ? (JSON.parse(raw) as Record<string, unknown>) : {};
  } catch {
    return { raw };
  }
}

async function pollJob(jobId: string) {
  const response = await fetch(joinUrl(getBaseUrl(), getJobPath(jobId)), {
    headers: {
      Authorization: `Bearer ${getApiKey()}`
    }
  });

  const payload = await parseResponse(response);
  if (!response.ok) {
    throw new Error(
      getString(payload.message) ?? getString(payload.error) ?? `Phaya job polling failed with ${response.status}.`
    );
  }

  return payload;
}

export function isPhayaConfigured() {
  return Boolean(getApiKey());
}

export async function generateImageWithPhaya(input: GeneratePhayaImageInput): Promise<GeneratedPhayaImage> {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error("PHAYA_API_KEY is missing.");
  }

  const createResponse = await fetch(joinUrl(getBaseUrl(), getCreatePath()), {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      prompt: input.prompt,
      aspect_ratio: inferAspectRatio(input.width ?? 1400, input.height ?? 840),
      ...(getEnv("PHAYA_MODEL") ? { model: getEnv("PHAYA_MODEL") } : {})
    })
  });

  const createPayload = await parseResponse(createResponse);
  if (!createResponse.ok) {
    throw new Error(
      getString(createPayload.message) ??
        getString(createPayload.error) ??
        `Phaya image creation failed with ${createResponse.status}.`
    );
  }

  const immediateUrl = extractImageUrl(createPayload);
  if (immediateUrl) {
    return {
      src: immediateUrl,
      provider: "phaya",
      jobId: extractJobId(createPayload)
    };
  }

  const jobId = extractJobId(createPayload);
  if (!jobId) {
    throw new Error("Phaya did not return an image URL or job ID.");
  }

  const maxAttempts = Number.parseInt(getEnv("PHAYA_POLL_ATTEMPTS") || "24", 10);
  const delayMs = Number.parseInt(getEnv("PHAYA_POLL_DELAY_MS") || "5000", 10);

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const payload = await pollJob(jobId);
    const imageUrl = extractImageUrl(payload);
    if (imageUrl) {
      return {
        src: imageUrl,
        provider: "phaya",
        jobId
      };
    }

    await new Promise((resolve) => setTimeout(resolve, delayMs));
  }

  throw new Error("Phaya image generation timed out.");
}
