import { Client } from 'minio'

const minioClient = new Client({
  endPoint: process.env.MINIO_ENDPOINT || 'localhost',
  port: parseInt(process.env.MINIO_PORT || '9000'),
  useSSL: process.env.MINIO_USE_SSL === 'true',
  accessKey: process.env.MINIO_ACCESS_KEY || 'minioadmin',
  secretKey: process.env.MINIO_SECRET_KEY || 'minioadmin',
})

const BUCKET = process.env.MINIO_BUCKET || 'docmind'

export async function uploadFile(
  objectKey: string,
  buffer: Buffer,
  mimeType: string
) {
  try {
    await minioClient.putObject(BUCKET, objectKey, buffer, buffer.length, {
      'Content-Type': mimeType,
    })
  } catch (error) {
    console.error('[MinIO] Upload failed:', error)
    throw error
  }
}

export async function downloadFile(objectKey: string): Promise<Buffer> {
  try {
    const chunks: Buffer[] = []
    const stream = await minioClient.getObject(BUCKET, objectKey)

    return new Promise((resolve, reject) => {
      stream.on('data', (chunk) => {
        chunks.push(chunk)
      })
      stream.on('end', () => {
        resolve(Buffer.concat(chunks))
      })
      stream.on('error', reject)
    })
  } catch (error) {
    console.error('[MinIO] Download failed:', error)
    throw error
  }
}

export async function deleteFile(objectKey: string) {
  try {
    await minioClient.removeObject(BUCKET, objectKey)
  } catch (error) {
    console.error('[MinIO] Delete failed:', error)
    throw error
  }
}

export async function getPresignedUrl(
  objectKey: string,
  expirySeconds = 3600
): Promise<string> {
  try {
    return await minioClient.presignedGetObject(
      BUCKET,
      objectKey,
      expirySeconds
    )
  } catch (error) {
    console.error('[MinIO] Presigned URL generation failed:', error)
    throw error
  }
}

export async function ensureBucket() {
  try {
    const exists = await minioClient.bucketExists(BUCKET)
    if (!exists) {
      await minioClient.makeBucket(BUCKET, 'us-east-1')
      console.log(`[MinIO] Created bucket: ${BUCKET}`)
    }
  } catch (error) {
    console.error('[MinIO] Bucket creation failed:', error)
    throw error
  }
}
