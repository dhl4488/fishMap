const maxPhotoDimension = 1_600
const targetPhotoBytes = 1024 * 1024
const supportedPhotoTypes = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif'])

export async function resizePhotoForUpload(file: File): Promise<File> {
  let bitmap: ImageBitmap
  try {
    bitmap = await createImageBitmap(file)
  } catch (error) {
    throw new Error(`Could not prepare "${file.name}" for upload. Choose a standard JPG, PNG, WebP, or GIF image.`, { cause: error })
  }

  try {
    if (
      supportedPhotoTypes.has(file.type) &&
      file.size <= 800_000 &&
      Math.max(bitmap.width, bitmap.height) <= maxPhotoDimension
    ) return file

    const canvas = document.createElement('canvas')
    const context = canvas.getContext('2d')
    if (!context) throw new Error('Photo resizing is unavailable in this browser.')

    let bestBlob: Blob | null = null
    for (let dimension = maxPhotoDimension; dimension >= 240; dimension = Math.floor(dimension * 0.8)) {
      const scale = Math.min(1, dimension / Math.max(bitmap.width, bitmap.height))
      canvas.width = Math.max(1, Math.round(bitmap.width * scale))
      canvas.height = Math.max(1, Math.round(bitmap.height * scale))
      context.fillStyle = '#fff'
      context.fillRect(0, 0, canvas.width, canvas.height)
      context.drawImage(bitmap, 0, 0, canvas.width, canvas.height)

      for (const quality of [0.82, 0.68, 0.54, 0.4, 0.28]) {
        const blob = await new Promise<Blob>((resolve, reject) => {
          canvas.toBlob(
            result => result ? resolve(result) : reject(new Error('Could not encode the resized photo.')),
            'image/jpeg',
            quality
          )
        })
        if (!bestBlob || blob.size < bestBlob.size) bestBlob = blob
        if (blob.size <= targetPhotoBytes) {
          const baseName = file.name.replace(/\.[^.]+$/, '') || 'photo'
          return new File([blob], `${baseName}.jpg`, { type: 'image/jpeg', lastModified: file.lastModified })
        }
      }
    }

    if (!bestBlob) throw new Error('Could not resize this photo. Choose another image.')

    const baseName = file.name.replace(/\.[^.]+$/, '') || 'photo'
    return new File([bestBlob], `${baseName}.jpg`, { type: 'image/jpeg', lastModified: file.lastModified })
  } finally {
    bitmap.close()
  }
}
