type GenerateGeminiImageInput = {
  prompt: string;
  width?: number;
  height?: number;
  model?: string;
};

type GeneratedGeminiImage = {
  src: string;
  provider: "gemini-banana";
};

const DEFAULT_BASE_URL = "https://generativelanguage.googleapis.com/v1beta";

function getEnv(name: string) {
  return process.env[name]?.trim() || "";
}

function getApiKey() {
  return getEnv("GEMINI_API_KEY");
}

function getBaseUrl() {
  return getEnv("GEMINI_IMAGE_BASE_URL") || DEFAULT_BASE_URL;
}

function getModel(model?: string) {
  if (model?.trim()) {
    return model.trim();
  }

  return getEnv("GEMINI_IMAGE_MODEL") || "gemini-2.5-flash-image";
}

function joinUrl(base: string, path: string) {
  return `${base.replace(/\/$/, "")}/${path.replace(/^\//, "")}`;
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

function getString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

async function parseResponse(response: Response) {
  const raw = await response.text();
  try {
    return raw ? (JSON.parse(raw) as Record<string, unknown>) : {};
  } catch {
    return { raw };
  }
}

function extractInlineImageData(payload: unknown) {
  const candidates = Array.isArray((payload as Record<string, unknown> | undefined)?.candidates)
    ? ((payload as Record<string, unknown>).candidates as Array<Record<string, unknown>>)
    : [];

  for (const candidate of candidates) {
    const content =
      candidate && typeof candidate.content === "object"
        ? (candidate.content as Record<string, unknown>)
        : null;
    const parts = Array.isArray(content?.parts) ? (content.parts as Array<Record<string, unknown>>) : [];

    for (const part of parts) {
      const inlineData =
        part && typeof part.inlineData === "object"
          ? (part.inlineData as Record<string, unknown>)
          : part && typeof part.inline_data === "object"
            ? (part.inline_data as Record<string, unknown>)
            : null;

      const mimeType = getString(inlineData?.mimeType) ?? getString(inlineData?.mime_type) ?? "image/png";
      const base64 = getString(inlineData?.data);

      if (base64) {
        return {
          mimeType,
          base64
        };
      }
    }
  }

  return null;
}

export function isGeminiImageConfigured() {
  return Boolean(getApiKey());
}

export async function generateImageWithGemini(
  input: GenerateGeminiImageInput
): Promise<GeneratedGeminiImage> {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is missing.");
  }

  const response = await fetch(
    joinUrl(getBaseUrl(), `models/${getModel(input.model)}:generateContent`),
    {
      method: "POST",
      headers: {
        "x-goog-api-key": apiKey,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: input.prompt
              }
            ]
          }
        ],
        generationConfig: {
          responseModalities: ["TEXT", "IMAGE"],
          imageConfig: {
            aspectRatio: inferAspectRatio(input.width ?? 1400, input.height ?? 840)
          }
        }
      })
    }
  );

  const payload = await parseResponse(response);
  if (!response.ok) {
    throw new Error(
      getString((payload as Record<string, unknown>).error) ??
        getString((payload as Record<string, unknown>).message) ??
        `Gemini image generation failed with ${response.status}.`
    );
  }

  const inlineImage = extractInlineImageData(payload);
  if (!inlineImage) {
    throw new Error("Gemini did not return inline image data.");
  }

  return {
    src: `data:${inlineImage.mimeType};base64,${inlineImage.base64}`,
    provider: "gemini-banana"
  };
}
