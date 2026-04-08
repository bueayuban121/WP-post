import { generateImageWithGemini, isGeminiImageConfigured } from "@/lib/gemini-image";
import { generateImageWithPhaya, isPhayaConfigured } from "@/lib/phaya";

type GenerateManagedImageInput = {
  prompt: string;
  width?: number;
  height?: number;
};

type ManagedImageProvider = "gemini-banana" | "phaya-nano-banana" | "prompt-fallback";

type ManagedGeneratedImage = {
  src: string;
  provider: ManagedImageProvider;
};

export function getPreferredImageProvider(): ManagedImageProvider {
  if (isGeminiImageConfigured()) {
    return "gemini-banana";
  }

  if (isPhayaConfigured()) {
    return "phaya-nano-banana";
  }

  return "prompt-fallback";
}

export function isManagedImageGenerationConfigured() {
  return getPreferredImageProvider() !== "prompt-fallback";
}

export function getImagePipelineEventLabel() {
  return isManagedImageGenerationConfigured() ? "managed-image-pipeline" : "prompt-fallback";
}

export async function generateManagedImage(
  input: GenerateManagedImageInput
): Promise<ManagedGeneratedImage> {
  if (isGeminiImageConfigured()) {
    try {
      const generated = await generateImageWithGemini(input);
      return {
        src: generated.src,
        provider: "gemini-banana"
      };
    } catch (error) {
      if (!isPhayaConfigured()) {
        throw error;
      }
    }
  }

  if (isPhayaConfigured()) {
    const generated = await generateImageWithPhaya(input);
    return {
      src: generated.src,
      provider: "phaya-nano-banana"
    };
  }

  throw new Error("No managed image provider is configured.");
}
