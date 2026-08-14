declare module "browser-id3-writer" {
  export default class ID3Writer {
    constructor(buffer: ArrayBuffer);
    setFrame(frameName: string, frameValue: any): this;
    addTag(): void;
    getBlob(): Blob;
    arrayBuffer: ArrayBuffer;
  }
}
