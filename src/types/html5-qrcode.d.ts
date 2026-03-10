// Minimal global typing for html5-qrcode usage in the app.
// The project uses `new Html5Qrcode(...)` without importing types,
// so provide a small global declaration to satisfy TypeScript.
declare global {
  class Html5Qrcode {
    constructor(elementId: string);
    start(
      cameraIdOrConfig: any,
      config: any,
      qrCodeSuccessCallback: (decodedText: string) => void,
      qrCodeErrorCallback?: (errorMessage: any) => void,
    ): Promise<void>;
    stop(): Promise<void>;
    clear(): void;
  }
}

export {};
