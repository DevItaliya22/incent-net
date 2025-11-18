import { NextResponse } from "next/server";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { v4 as uuidv4 } from "uuid";

export const runtime = "nodejs";
export const maxDuration = 30;

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

function getS3Client() {
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
  const region = process.env.AWS_REGION || "ap-south-1";

  if (!accessKeyId || !secretAccessKey) {
    throw new Error("AWS credentials not configured");
  }

  return new S3Client({
    region,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
  });
}

export async function POST(request: Request) {
  try {
    console.log("Upload request received");

    const bucketName = process.env.AWS_BUCKET_NAME;
    if (!bucketName) {
      console.error("AWS_S3_BUCKET_NAME not set");
      return NextResponse.json(
        { error: "S3 bucket not configured" },
        { status: 500 }
      );
    }

    const formData = await request.formData();
    const file = formData.get("file") as File;

    console.log(
      "File received:",
      file ? { name: file.name, size: file.size, type: file.type } : "null"
    );

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (!file.type.startsWith("image/")) {
      return NextResponse.json(
        { error: "File must be an image" },
        { status: 400 }
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `File size exceeds ${MAX_FILE_SIZE / 1024 / 1024}MB limit` },
        { status: 400 }
      );
    }

    const fileExtension = file.name.split(".").pop() || "jpg";
    const fileName = `products/${uuidv4()}.${fileExtension}`;

    console.log("Processing file:", fileName, "Size:", file.size);

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    console.log("Buffer created, size:", buffer.length);

    const s3Client = getS3Client();
    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: fileName,
      Body: buffer,
      ContentType: file.type,
      CacheControl: "max-age=31536000",
    });

    console.log("Sending to S3...", { bucket: bucketName, key: fileName });
    await s3Client.send(command);
    console.log("Upload successful");

    const region = process.env.AWS_REGION || "ap-south-1";
    const publicUrl = process.env.AWS_S3_PUBLIC_URL
      ? `${process.env.AWS_S3_PUBLIC_URL}/${fileName}`
      : `https://${bucketName}.s3.${region}.amazonaws.com/${fileName}`;

    return NextResponse.json({ url: publicUrl });
  } catch (error: any) {
    console.error("Upload error details:", {
      name: error?.name,
      code: error?.code,
      message: error?.message,
      stack: error?.stack,
      $metadata: error?.$metadata,
    });

    if (error.message === "AWS credentials not configured") {
      return NextResponse.json(
        {
          error:
            "AWS credentials are not configured. Please set AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY.",
        },
        { status: 500 }
      );
    }

    if (error.code === "MaxMessageLengthExceeded") {
      return NextResponse.json(
        { error: "File is too large. Please use an image smaller than 10MB." },
        { status: 413 }
      );
    }

    if (
      error.name === "CredentialsError" ||
      error.name === "InvalidAccessKeyId" ||
      error.code === "InvalidAccessKeyId"
    ) {
      return NextResponse.json(
        { error: "AWS credentials are invalid or not configured" },
        { status: 500 }
      );
    }

    if (error.code === "NoSuchBucket") {
      return NextResponse.json(
        {
          error: `S3 bucket "${process.env.AWS_BUCKET_NAME}" does not exist or is not accessible`,
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        error: "Failed to upload image",
        details: error.message || "Unknown error",
        code: error.code || error.name,
      },
      { status: 500 }
    );
  }
}
