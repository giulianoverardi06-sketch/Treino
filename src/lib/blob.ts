function readWith<T>(read: (r: FileReader) => void, pick: (r: FileReader) => T) {
  return new Promise<T>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      resolve(pick(reader));
    };
    reader.onerror = () => {
      reject(reader.error ?? new Error('Falha ao ler o arquivo'));
    };
    read(reader);
  });
}

/** Bytes de um Blob. Usa `arrayBuffer()` e cai para FileReader em navegadores antigos. */
export async function blobToBytes(blob: Blob): Promise<Uint8Array> {
  try {
    return new Uint8Array(await blob.arrayBuffer());
  } catch {
    return readWith(
      (r) => {
        r.readAsArrayBuffer(blob);
      },
      (r) => new Uint8Array(r.result as ArrayBuffer),
    );
  }
}

/** Texto de um arquivo escolhido pelo usuário. */
export async function blobToText(blob: Blob): Promise<string> {
  try {
    return await blob.text();
  } catch {
    return readWith(
      (r) => {
        r.readAsText(blob);
      },
      (r) => (typeof r.result === 'string' ? r.result : ''),
    );
  }
}
