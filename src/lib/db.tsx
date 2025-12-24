// src/lib/db.ts
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { awsCredentialsProvider } from "@vercel/oidc-aws-credentials-provider";

const isDev = process.env.NODE_ENV === "development";

const client = new DynamoDBClient({
  region: "us-east-1",
  credentials: isDev
    ? {
        // Localhost: Use standard keys from .env.local
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
      }
    : awsCredentialsProvider({
        // Production (Vercel): Use OIDC
        roleArn: process.env.AWS_ROLE_ARN,
      }),
});

export const docClient = DynamoDBDocumentClient.from(client);