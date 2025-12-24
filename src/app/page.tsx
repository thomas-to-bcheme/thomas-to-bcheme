import Image from "next/image";
import { docClient } from "@/lib/db";
import { ScanCommand } from "@aws-sdk/lib-dynamodb";

// 1. Mark component as 'async' to fetch data server-side
export default async function Home() {
  
  // 2. Use to get the actual data
  const response = await docClient.send(new ScanCommand({
    TableName: process.env.DYNAMODB_TABLE_NAME
  }));
  
  // 3. Extract items safely
  const comments = response.Items ?? [];

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 font-sans dark:bg-black">
      <main className="flex min-h-screen w-full max-w-3xl flex-col items-center justify-between py-32 px-16 bg-white dark:bg-black sm:items-start">
        {/* ... (Your existing Image code) ... */}
        
        <div className="flex flex-col items-center gap-6 text-center sm:items-start sm:text-left">
          <h1 className="max-w-xs text-3xl font-semibold leading-10 tracking-tight text-black dark:text-zinc-50">
            Thomas's Hello World.
          </h1>
          
          {/* --- NEW SECTION: DISPLAY COMMENTS --- */}
          <div className="w-full mt-8 border-t pt-8">
            <h2 className="text-xl font-bold mb-4">Database Comments:</h2>
            {comments.length === 0 ? (
              <p className="text-gray-500">No comments found.</p>
            ) : (
              <ul className="space-y-4 text-left w-full">
                {comments.map((comment, index) => (
                  <li key={index} className="p-4 border rounded-lg shadow-sm bg-gray-50 dark:bg-zinc-900">
                    {/* Replace 'comment.content' with your actual DynamoDB column names */}
                    <p className="font-mono text-sm">{JSON.stringify(comment)}</p>
                  </li>
                ))}
              </ul>
            )}
          </div>
          {/* ------------------------------------- */}

        </div>
        
        {/* ... (Your existing Buttons code) ... */}
      </main>
    </div>
  );
}