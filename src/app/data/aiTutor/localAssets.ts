// Pinned manifest for the local inference assets. The sha256 values ship inside the
// signed app bundle and are verified before an asset is used, so a tampered or
// corrupted download fails closed.

export type LocalAsset = {
   // For the runtime this is the downloaded archive name; for the model it's the
   // final on-disk filename.
   filename: string;
   url: string;
   sha256: string;
   approxBytes: number;
};

// llama.cpp Vulkan build for Windows x64. Uses the GPU (NVIDIA / AMD / Intel) when
// one is available and falls back to CPU otherwise. Downloaded as a zip and
// extracted into bin/; the sha256 is of the zip. Pinned to a specific rolling build.
export const LLAMA_SERVER: LocalAsset = {
   filename: "llama-b10734-bin-win-vulkan-x64.zip",
   url: "https://github.com/ggml-org/llama.cpp/releases/download/b10734/llama-b10734-bin-win-vulkan-x64.zip",
   sha256: "80fb387450310b7266c659ea510df381d480ab6e07e9f89c2742607dbfc94efd",
   approxBytes: 35_178_598,
};

// The executable extracted from the archive above.
export const LLAMA_SERVER_BINARY = "llama-server.exe";

// unsloth/gemma-4-E2B-it-GGUF, UD-Q4_K_XL (Unsloth Dynamic) quant. Ungated,
// Apache-2.0 (Gemma terms apply).
export const GEMMA_MODEL: LocalAsset = {
   filename: "gemma-4-E2B-it-UD-Q4_K_XL.gguf",
   url: "https://huggingface.co/unsloth/gemma-4-E2B-it-GGUF/resolve/main/gemma-4-E2B-it-UD-Q4_K_XL.gguf",
   sha256: "b52f438017efaec5debf1c0d8be690571e212a07c312f1102bbce927258cfc32",
   approxBytes: 3_184_496_736,
};

export const GEMMA_LICENSE_URL = "https://ai.google.dev/gemma/terms";
export const LLAMA_CPP_LICENSE_URL = "https://github.com/ggml-org/llama.cpp/blob/master/LICENSE";

export function localAssetsConfigured(): boolean {
   return Boolean(LLAMA_SERVER.url && LLAMA_SERVER.sha256 && GEMMA_MODEL.url && GEMMA_MODEL.sha256);
}
