import type { Concept } from './types';

export const INTEROP_CONCEPTS: Concept[] = [
  {
    id: 'c-abi',
    part: 'interop',
    navLabel: 'Calling native code (C ABI)',
    title: 'Crossing the C ABI in-process',
    summary:
      'The C ABI is the lowest common calling convention, so almost any language can export or call a C-style function in a shared library. The running example is double sum_f64(const double* data, size_t len): a pointer and a length, with no copy of the buffer.',
    snippets: {
      sql: {
        code: `-- PostgreSQL loads a C function from a shared library and exposes it as SQL.
-- The C side uses the PG_FUNCTION_ARGS macros; here it is declared from SQL:
CREATE FUNCTION sum_f64(double precision[]) RETURNS double precision
AS '$libdir/mycore', 'sum_f64_pg'
LANGUAGE C STRICT IMMUTABLE PARALLEL SAFE;

SELECT sum_f64(ARRAY[1.5, 2.5, 3.0]);       -- 7
-- The function runs INSIDE the server process: a crash takes down the backend, so it needs
-- superuser rights to create. Prefer PL/pgSQL or a pure SQL function unless you need native speed.`,
        note: 'Extensions are the in-process FFI of a database.',
      },
      python: {
        code: `import ctypes
from array import array

lib = ctypes.CDLL("./target/release/libcore.so")        # .dylib on macOS, .dll on Windows
lib.sum_f64.argtypes = [ctypes.POINTER(ctypes.c_double), ctypes.c_size_t]
lib.sum_f64.restype = ctypes.c_double                    # without these, ctypes assumes int and corrupts data

values = array("d", [1.5, 2.5, 3.0])                      # a contiguous buffer of C doubles
pointer = (ctypes.c_double * len(values)).from_buffer(values)    # zero-copy view of the same memory
print(lib.sum_f64(pointer, len(values)))                  # 7.0

# PyO3 + Maturin gives a Rust module that imports like any Python package (no ctypes needed).
# NumPy arrays expose their buffer too: array.ctypes.data_as(ctypes.POINTER(ctypes.c_double)).`,
      },
      typescript: {
        code: `// Node.js has no built-in FFI. koffi is a third-party loader; Bun and Deno ship their own.
import koffi from "koffi";

const library = koffi.load("./target/release/libcore.dylib");     // .so on Linux, .dll on Windows
const sumF64 = library.func("double sum_f64(double *data, size_t len)");

const buffer = new Float64Array(1_000_000).fill(1.5);
console.log(sumF64(buffer, buffer.length));                         // 1500000: the typed array is passed by pointer

// For a Node-API addon written in Rust, use napi-rs; in C++, node-addon-api.`,
      },
      spark: {
        code: `# Native code from Spark: ship the library to executors and call it from a vectorised UDF.
import ctypes
import pandas as pd
from pyspark.sql.functions import pandas_udf

spark.sparkContext.addFile("/path/libcore.so")          # copied to every executor

@pandas_udf("double")
def native_sum(batch: pd.Series) -> float:
    from pyspark import SparkFiles
    lib = ctypes.CDLL(SparkFiles.get("libcore.so"))
    lib.sum_f64.argtypes = [ctypes.POINTER(ctypes.c_double), ctypes.c_size_t]
    lib.sum_f64.restype = ctypes.c_double
    values = batch.to_numpy(dtype="float64")
    return lib.sum_f64(values.ctypes.data_as(ctypes.POINTER(ctypes.c_double)), len(values))

frame.agg(native_sum("amount"))                          # Arrow batches reach the library without per-row copies`,
        note: 'Each Python worker loads the library; a crash in native code kills that worker and fails the task.',
      },
      rust: {
        code: `// Exporting: build as a dynamic C library with  [lib] crate-type = ["cdylib"]  in Cargo.toml.
/// Sum of a float64 buffer owned by the caller.
///
/// # Safety
/// \`data\` must point to \`len\` valid, initialised f64 values.
#[no_mangle]                                   // in edition 2024 write #[unsafe(no_mangle)]
pub unsafe extern "C" fn sum_f64(data: *const f64, len: usize) -> f64 {
    if data.is_null() {
        return 0.0;
    }
    let values = std::slice::from_raw_parts(data, len);   // no copy: a view over the caller's memory
    values.iter().sum()
}

// Importing a C function:
extern "C" {
    fn strlen(text: *const std::os::raw::c_char) -> usize;
}
// Every call across the boundary is unsafe: the compiler cannot check what C does with the pointer.
// Tools: cbindgen generates the C header; bindgen generates Rust bindings from a C header.`,
      },
      cpp: {
        code: `// core.cpp -- exporting with C linkage so the symbol name is not mangled.
#include <cstddef>

extern "C" double sum_f64(const double* data, std::size_t len) {
    double total = 0;
    for (std::size_t i = 0; i < len; ++i) total += data[i];
    return total;
}
// Build: g++ -O2 -shared -fPIC core.cpp -o libcore.so      (-dynamiclib and .dylib on macOS)

// consumer.cpp -- calling it by linking, or by loading at run time:
#include <dlfcn.h>
#include <iostream>

int main() {
    void* library = dlopen("./libcore.so", RTLD_NOW);
    if (!library) { std::cerr << dlerror() << "\\n"; return 1; }
    auto sum = reinterpret_cast<double (*)(const double*, std::size_t)>(dlsym(library, "sum_f64"));
    double values[] = {1.5, 2.5, 3.0};
    std::cout << sum(values, 3) << "\\n";      // 7
    dlclose(library);
}
// Never throw a C++ exception across an extern "C" boundary: catch it and return an error code.`,
      },
      go: {
        code: `// Calling C from Go with cgo. The comment directly above import "C" is compiled as C.
package main

/*
#cgo LDFLAGS: -L\${SRCDIR}/target/release -lcore
double sum_f64(const double* data, size_t len);
*/
import "C"
import (
    "fmt"
    "unsafe"
)

func main() {
    values := []float64{1.5, 2.5, 3.0}
    total := C.sum_f64((*C.double)(unsafe.Pointer(&values[0])), C.size_t(len(values)))   // pass Go memory by pointer
    fmt.Println(float64(total))     // 7
}
// The Go GC may only be given pointers to memory that holds no Go pointers (cgo rules).
// Each cgo call costs roughly tens of nanoseconds more than a Go call.
// Exporting Go to C: put //export Name above a func and build with  go build -buildmode=c-shared.`,
      },
      swift: {
        code: `// Swift calls C through a module map or a bridging header; the C declaration is
// double sum_f64(const double *data, size_t len);   (in core.h)
import CoreLib   // a system library target that wraps core.h

let values: [Double] = [1.5, 2.5, 3.0]
let total = values.withUnsafeBufferPointer { buffer in
    sum_f64(buffer.baseAddress, buffer.count)        // pointer valid only inside this closure
}
print(total)     // 7.0

// Exporting a Swift function to C:
@_cdecl("swift_add")
public func swiftAdd(_ a: Int32, _ b: Int32) -> Int32 { a + b }
// Use withUnsafeBufferPointer; never keep the pointer after the closure returns.`,
      },
      kotlin: {
        code: `// JDK 22+: the Foreign Function & Memory API (java.lang.foreign) calls C without JNI.
import java.lang.foreign.*
import java.lang.invoke.MethodHandle

fun main() {
    val linker = Linker.nativeLinker()
    val lookup = SymbolLookup.libraryLookup("./target/release/libcore.so", Arena.global())
    val sumF64: MethodHandle = linker.downcallHandle(
        lookup.find("sum_f64").orElseThrow(),
        FunctionDescriptor.of(ValueLayout.JAVA_DOUBLE, ValueLayout.ADDRESS, ValueLayout.JAVA_LONG),
    )

    Arena.ofConfined().use { arena ->
        val segment = arena.allocateArray(ValueLayout.JAVA_DOUBLE, 1.5, 2.5, 3.0)   // off-heap memory
        println(sumF64.invokeWithArguments(segment, 3L))                              // 7.0
    }
}
// Older JVMs use JNI (System.loadLibrary plus an external fun) or JNA. Kotlin/Native uses cinterop.`,
        note: 'Requires JDK 22 or newer (the API was finalised in 22).',
      },
    },
    takeaway:
      'An FFI call is a plain function call plus a promise about memory: the caller owns the buffer, the callee reads it for the duration of the call, and both agree on layout. Keep the surface to flat C types, and treat every pointer as a contract to document.',
  },
  {
    id: 'http-server',
    part: 'interop',
    navLabel: 'Serving a JSON endpoint',
    title: 'Serving an HTTP JSON endpoint',
    summary:
      'The decoupled design puts the computation behind a network boundary. The service parses and validates the request, calls the compute core, and returns JSON with a clear status code on failure.',
    snippets: {
      sql: {
        code: `-- PostgREST (a separate server) exposes tables and functions as a REST API, generated from the schema.
CREATE FUNCTION sum_values(values double precision[]) RETURNS jsonb
LANGUAGE sql IMMUTABLE AS $$ SELECT jsonb_build_object('total', (SELECT sum(v) FROM unnest(values) v)) $$;

-- Then:   POST /rpc/sum_values   {"values": [1.5, 2.5, 3]}   ->   {"total": 7}
-- Row-level security and roles in the database enforce who may call what.`,
        note: 'The database does not speak HTTP itself; a gateway such as PostgREST does.',
      },
      python: {
        code: `import ctypes
from fastapi import FastAPI
from pydantic import BaseModel, Field

core = ctypes.CDLL("./target/release/libcore.so")
core.sum_f64.argtypes = [ctypes.POINTER(ctypes.c_double), ctypes.c_size_t]
core.sum_f64.restype = ctypes.c_double

app = FastAPI()

class SumRequest(BaseModel):
    values: list[float] = Field(max_length=1_000_000)          # validate at the trust boundary

class SumResponse(BaseModel):
    total: float

@app.post("/sum", response_model=SumResponse)
def sum_values(request: SumRequest) -> SumResponse:
    array = (ctypes.c_double * len(request.values))(*request.values)     # one copy from list to C array
    return SumResponse(total=core.sum_f64(array, len(request.values)))

# Run:  uvicorn main:app --port 8000        (requires fastapi, pydantic, uvicorn)`,
      },
      typescript: {
        code: `import { createServer } from "node:http";

const MAX_BODY_BYTES = 1_000_000;

const server = createServer(async (request, response) => {
  if (request.method !== "POST" || request.url !== "/sum") {
    response.writeHead(404).end();
    return;
  }
  try {
    const chunks: Buffer[] = [];
    let size = 0;
    for await (const chunk of request) {
      size += chunk.length;
      if (size > MAX_BODY_BYTES) throw new RangeError("payload too large");
      chunks.push(chunk);
    }
    const body = JSON.parse(Buffer.concat(chunks).toString("utf8"));
    if (!Array.isArray(body.values) || !body.values.every((v: unknown) => typeof v === "number")) {
      throw new TypeError("values must be an array of numbers");     // validate before use
    }
    const total = body.values.reduce((sum: number, v: number) => sum + v, 0);
    response.writeHead(200, { "Content-Type": "application/json" }).end(JSON.stringify({ total }));
  } catch (error) {
    const status = error instanceof RangeError ? 413 : 400;
    response.writeHead(status).end(JSON.stringify({ error: (error as Error).message }));
  }
});
server.listen(8080);`,
      },
      spark: {
        code: `# Spark is not a request/response server. To serve results, write them to a store the
# service reads, or run Spark Connect / Livy / a Thrift server for SQL over a network protocol.
result = frame.agg(F.sum("amount").alias("total"))
result.write.mode("overwrite").json("s3://bucket/reports/latest")     # an API reads this file

# Spark Connect (Spark 3.4+): a thin client sends the logical plan to a remote Spark server.
# SparkSession.builder.remote("sc://spark-host:15002").getOrCreate()`,
        note: 'Serving low-latency requests from Spark is an anti-pattern; precompute and serve from a fast store.',
      },
      rust: {
        code: `// Axum is the common choice; this needs  axum = "0.7", tokio = { version = "1", features = ["full"] },
// serde = { version = "1", features = ["derive"] }.
use axum::{http::StatusCode, routing::post, Json, Router};
use serde::{Deserialize, Serialize};

#[derive(Deserialize)]
struct SumRequest { values: Vec<f64> }

#[derive(Serialize)]
struct SumResponse { total: f64 }

async fn sum_values(Json(request): Json<SumRequest>) -> Result<Json<SumResponse>, StatusCode> {
    if request.values.len() > 1_000_000 { return Err(StatusCode::PAYLOAD_TOO_LARGE); }
    Ok(Json(SumResponse { total: request.values.iter().sum() }))     // typed JSON in and out
}

#[tokio::main]
async fn main() {
    let app = Router::new().route("/sum", post(sum_values));
    let listener = tokio::net::TcpListener::bind("0.0.0.0:8080").await.unwrap();
    axum::serve(listener, app).await.unwrap();
}`,
      },
      cpp: {
        code: `// The C++ standard library has no HTTP server. Common choices: Boost.Beast, cpp-httplib, Crow, Drogon.
// cpp-httplib (single header) with nlohmann::json:
#include <httplib.h>
#include <nlohmann/json.hpp>
#include <numeric>

int main() {
    httplib::Server server;
    server.Post("/sum", [](const httplib::Request& request, httplib::Response& response) {
        try {
            auto body = nlohmann::json::parse(request.body);
            auto values = body.at("values").get<std::vector<double>>();      // throws on wrong types
            double total = std::accumulate(values.begin(), values.end(), 0.0);
            response.set_content(nlohmann::json{{"total", total}}.dump(), "application/json");
        } catch (const nlohmann::json::exception& error) {
            response.status = 400;
            response.set_content(nlohmann::json{{"error", error.what()}}.dump(), "application/json");
        }
    });
    server.listen("0.0.0.0", 8080);
}`,
        note: 'Requires cpp-httplib and nlohmann/json.',
      },
      go: {
        code: `package main

import (
    "encoding/json"
    "net/http"
)

type sumRequest struct {
    Values []float64 \`json:"values"\`
}

type sumResponse struct {
    Total float64 \`json:"total"\`
}

func sumHandler(w http.ResponseWriter, r *http.Request) {
    r.Body = http.MaxBytesReader(w, r.Body, 1<<20) // cap the body at 1 MiB
    var request sumRequest
    if err := json.NewDecoder(r.Body).Decode(&request); err != nil {
        http.Error(w, err.Error(), http.StatusBadRequest)
        return
    }
    total := 0.0
    for _, value := range request.Values {
        total += value
    }
    w.Header().Set("Content-Type", "application/json")
    json.NewEncoder(w).Encode(sumResponse{Total: total})
}

func main() {
    mux := http.NewServeMux()
    mux.HandleFunc("POST /sum", sumHandler) // Go 1.22+ method patterns
    http.ListenAndServe(":8080", mux)
}`,
      },
      swift: {
        code: `// Vapor is the common server framework (a Swift package):
import Vapor

struct SumRequest: Content { var values: [Double] }
struct SumResponse: Content { var total: Double }

func routes(_ app: Application) throws {
    app.post("sum") { request async throws -> SumResponse in
        let body = try request.content.decode(SumRequest.self)      // 400 automatically if malformed
        guard body.values.count <= 1_000_000 else { throw Abort(.payloadTooLarge) }
        return SumResponse(total: body.values.reduce(0, +))
    }
}
// Run with: swift run (the Vapor template provides the entry point). SwiftNIO is the lower-level engine beneath it.`,
        note: 'Requires the Vapor package.',
      },
      kotlin: {
        code: `// Ktor server (io.ktor:ktor-server-netty, content-negotiation, kotlinx-serialization-json):
import io.ktor.http.*
import io.ktor.serialization.kotlinx.json.*
import io.ktor.server.application.*
import io.ktor.server.engine.*
import io.ktor.server.netty.*
import io.ktor.server.plugins.contentnegotiation.*
import io.ktor.server.request.*
import io.ktor.server.response.*
import io.ktor.server.routing.*
import kotlinx.serialization.Serializable

@Serializable data class SumRequest(val values: List<Double>)
@Serializable data class SumResponse(val total: Double)

fun main() {
    embeddedServer(Netty, port = 8080) {
        install(ContentNegotiation) { json() }
        routing {
            post("/sum") {
                val request = call.receive<SumRequest>()
                if (request.values.size > 1_000_000) return@post call.respond(HttpStatusCode.PayloadTooLarge)
                call.respond(SumResponse(request.values.sum()))
            }
        }
    }.start(wait = true)
}`,
        note: 'Requires Ktor and kotlinx.serialization.',
      },
    },
    takeaway:
      'Validate at the boundary (size, types, ranges), return a precise status code, and keep the handler thin: parse, call the core, serialise. Everything crossing the network is untrusted input.',
  },
  {
    id: 'http-client',
    part: 'interop',
    navLabel: 'Calling a JSON endpoint',
    title: 'Calling an HTTP JSON endpoint',
    summary:
      'A client must set a timeout, check the status code (many libraries do not throw on 4xx and 5xx), parse the body defensively, and decide whether a failure is worth retrying.',
    snippets: {
      sql: {
        code: `-- Calling out of the database is possible with an extension, but is usually a bad idea:
-- a slow endpoint holds a connection and a transaction open.
CREATE EXTENSION http;                                                -- pgsql-http
SELECT status, content::jsonb ->> 'total' AS total
FROM http_post('https://api.example.com/sum', '{"values":[1.5,2.5,3]}', 'application/json');

-- Better: have a worker outside the database read a queue table, call the API, and write results back.`,
        note: 'Requires the pgsql-http extension.',
      },
      python: {
        code: `import httpx

def total(values: list[float]) -> float:
    try:
        with httpx.Client(timeout=httpx.Timeout(5.0, connect=2.0)) as client:     # always set a timeout
            response = client.post("https://api.example.com/sum", json={"values": values})
            response.raise_for_status()                    # turn 4xx/5xx into exceptions
            return response.json()["total"]
    except httpx.TimeoutException:
        raise TimeoutError("sum service timed out") from None
    except (httpx.HTTPStatusError, KeyError, ValueError) as error:
        raise RuntimeError(f"sum service failed: {error}") from error

# httpx is third-party. The standard library alternative is urllib.request, which is more verbose.
# async version: async with httpx.AsyncClient() as client: await client.post(...)`,
      },
      typescript: {
        code: `import { useState } from "react";

// A typed client with a timeout, a status check, and shape validation.
export async function sumRemote(values: number[]): Promise<number> {
  const response = await fetch("/sum", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ values }),
    signal: AbortSignal.timeout(5000),                     // fetch has NO default timeout
  });
  if (!response.ok) throw new Error(\`HTTP \${response.status}\`);   // fetch does not reject on 4xx/5xx
  const data: unknown = await response.json();
  if (typeof data !== "object" || data === null || typeof (data as { total?: unknown }).total !== "number") {
    throw new TypeError("unexpected response shape");      // types vanish at run time: validate
  }
  return (data as { total: number }).total;
}

export function SumForm() {
  const [total, setTotal] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  return (
    <div>
      <button onClick={() => sumRemote([1.5, 2.5, 3]).then(setTotal).catch((e) => setError(String(e)))}>Sum</button>
      {total !== null && <p>Total: {total}</p>}
      {error && <p role="alert">{error}</p>}
    </div>
  );
}`,
      },
      spark: {
        code: `# Call an API per partition, not per row: reuse one HTTP session and batch the requests.
import requests

def enrich(rows):
    session = requests.Session()                               # one connection pool per partition
    batch = []
    for row in rows:
        batch.append(row.amount)
        if len(batch) == 500:
            yield from call(session, batch); batch = []
    if batch:
        yield from call(session, batch)

def call(session, values):
    response = session.post("https://api.example.com/sum", json={"values": values}, timeout=5)
    response.raise_for_status()
    yield response.json()["total"]

totals = frame.rdd.mapPartitions(enrich)
# Cap concurrency with executor cores and add retries with back-off; unbounded calls can take an API down.`,
      },
      rust: {
        code: `use serde::{Deserialize, Serialize};
use std::time::Duration;

#[derive(Serialize)]
struct SumRequest<'a> { values: &'a [f64] }

#[derive(Deserialize)]
struct SumResponse { total: f64 }

async fn sum_remote(client: &reqwest::Client, values: &[f64]) -> Result<f64, reqwest::Error> {
    let response = client
        .post("https://api.example.com/sum")
        .json(&SumRequest { values })
        .send()
        .await?
        .error_for_status()?;                    // 4xx/5xx become Err
    Ok(response.json::<SumResponse>().await?.total)   // deserialisation errors are Err too
}

#[tokio::main]
async fn main() -> Result<(), reqwest::Error> {
    let client = reqwest::Client::builder().timeout(Duration::from_secs(5)).build()?;   // reuse the client
    println!("{}", sum_remote(&client, &[1.5, 2.5, 3.0]).await?);
    Ok(())
}
// Requires reqwest (with the "json" feature), serde, tokio.`,
      },
      cpp: {
        code: `#include <httplib.h>
#include <nlohmann/json.hpp>
#include <iostream>
#include <optional>

std::optional<double> sum_remote(const std::vector<double>& values) {
    httplib::Client client("http://localhost:8080");
    client.set_connection_timeout(2, 0);          // seconds
    client.set_read_timeout(5, 0);

    auto response = client.Post("/sum", nlohmann::json{{"values", values}}.dump(), "application/json");
    if (!response) return std::nullopt;                     // network failure or timeout
    if (response->status != 200) return std::nullopt;       // 4xx/5xx
    auto body = nlohmann::json::parse(response->body, nullptr, /*allow_exceptions=*/false);
    if (body.is_discarded() || !body.contains("total")) return std::nullopt;
    return body["total"].get<double>();
}
// Requires cpp-httplib and nlohmann/json. libcurl is the other common choice.`,
      },
      go: {
        code: `type sumRequest struct {
    Values []float64 \`json:"values"\`
}
type sumResponse struct {
    Total float64 \`json:"total"\`
}

var client = &http.Client{Timeout: 5 * time.Second} // the zero-value http.Client has NO timeout; reuse one

func sumRemote(ctx context.Context, values []float64) (float64, error) {
    payload, err := json.Marshal(sumRequest{Values: values})
    if err != nil {
        return 0, err
    }
    request, err := http.NewRequestWithContext(ctx, http.MethodPost, "https://api.example.com/sum", bytes.NewReader(payload))
    if err != nil {
        return 0, err
    }
    request.Header.Set("Content-Type", "application/json")

    response, err := client.Do(request)
    if err != nil {
        return 0, fmt.Errorf("sum request: %w", err)
    }
    defer response.Body.Close()          // always close, or connections leak
    if response.StatusCode != http.StatusOK {
        return 0, fmt.Errorf("sum service returned %s", response.Status)
    }
    var parsed sumResponse
    if err := json.NewDecoder(response.Body).Decode(&parsed); err != nil {
        return 0, fmt.Errorf("decode response: %w", err)
    }
    return parsed.Total, nil
}`,
      },
      swift: {
        code: `import Foundation

struct SumRequest: Encodable { let values: [Double] }
struct SumResponse: Decodable { let total: Double }

func sumRemote(_ values: [Double]) async throws -> Double {
    var request = URLRequest(url: URL(string: "https://api.example.com/sum")!)
    request.httpMethod = "POST"
    request.setValue("application/json", forHTTPHeaderField: "Content-Type")
    request.httpBody = try JSONEncoder().encode(SumRequest(values: values))
    request.timeoutInterval = 5

    let (data, response) = try await URLSession.shared.data(for: request)
    guard let http = response as? HTTPURLResponse, (200..<300).contains(http.statusCode) else {
        throw URLError(.badServerResponse)               // URLSession does not throw on 4xx/5xx
    }
    return try JSONDecoder().decode(SumResponse.self, from: data).total
}

let total = try await sumRemote([1.5, 2.5, 3.0])`,
      },
      kotlin: {
        code: `import java.net.URI
import java.net.http.HttpClient
import java.net.http.HttpRequest
import java.net.http.HttpResponse
import java.time.Duration
import kotlinx.serialization.Serializable
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json

@Serializable data class SumRequest(val values: List<Double>)
@Serializable data class SumResponse(val total: Double)

private val client = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(2)).build()

fun sumRemote(values: List<Double>): Double {
    val request = HttpRequest.newBuilder(URI("https://api.example.com/sum"))
        .timeout(Duration.ofSeconds(5))
        .header("Content-Type", "application/json")
        .POST(HttpRequest.BodyPublishers.ofString(Json.encodeToString(SumRequest(values))))
        .build()
    val response = client.send(request, HttpResponse.BodyHandlers.ofString())
    check(response.statusCode() in 200..299) { "sum service returned \${response.statusCode()}" }
    return Json.decodeFromString<SumResponse>(response.body()).total
}
// JDK HttpClient is built in (Java 11+); Ktor Client or OkHttp are the usual alternatives.`,
      },
    },
    takeaway:
      'A network client needs four things the FFI call did not: a timeout, a status check, a validated response shape, and a retry policy. Reuse one client (connection pool) instead of creating one per call.',
  },
  {
    id: 'serialization',
    part: 'interop',
    navLabel: 'Serialization cost',
    title: 'Serialization: JSON versus binary',
    summary:
      'Crossing a network means turning data into bytes and back. JSON is human-readable and universal but spends time and size on text; a binary format (Protocol Buffers, MessagePack, Arrow) is smaller and faster to parse. FFI can skip serialization entirely by sharing memory.',
    snippets: {
      sql: {
        code: `-- jsonb stores a parsed binary form: faster to query, slower to insert than plain json text.
SELECT pg_column_size(to_jsonb(ARRAY[1.5, 2.5, 3.0]))   AS jsonb_bytes,
       pg_column_size(ARRAY[1.5, 2.5, 3.0]::float8[])   AS native_array_bytes;

-- COPY ... (FORMAT binary) moves rows in PostgreSQL's binary wire format, skipping text parsing:
COPY big_table TO '/tmp/big.bin' (FORMAT binary);
-- Retrieve a numeric array without JSON: SELECT values FROM t;   (binary protocol in most drivers)`,
      },
      python: {
        code: `import json
import struct
import time

values = [1.5] * 1_000_000

start = time.perf_counter()
text = json.dumps(values)                                  # numbers become decimal text
decoded = json.loads(text)
json_seconds = time.perf_counter() - start

start = time.perf_counter()
binary = struct.pack(f"{len(values)}d", *values)           # 8 bytes per double, fixed layout
restored = struct.unpack(f"{len(values)}d", binary)
binary_seconds = time.perf_counter() - start

print(len(text), len(binary))                              # about 5 MB of JSON vs exactly 8 MB of binary
print(json_seconds, binary_seconds)
# 1.5 is only 3 characters, which flatters JSON. Typical doubles need up to 17 digits, so real data
# is usually larger as text than as binary. Always measure with your own data.
# Alternatives: MessagePack (msgpack), Protocol Buffers, Apache Arrow IPC, numpy.tobytes().`,
      },
      typescript: {
        code: `const values = new Float64Array(1_000_000).fill(1.5);

console.time("json");
const text = JSON.stringify(Array.from(values));           // typed arrays are not JSON-serialisable directly
const parsed = JSON.parse(text);
console.timeEnd("json");

console.time("binary");
const bytes = new Uint8Array(values.buffer);               // a VIEW of the same memory: zero copy
const restored = new Float64Array(bytes.buffer, bytes.byteOffset, bytes.byteLength / 8);
console.timeEnd("binary");

console.log(text.length, bytes.byteLength);
// Send binary over HTTP with  Content-Type: application/octet-stream  and  fetch(url, { body: values.buffer }).
// Mind endianness when the two sides differ: DataView lets you choose it.`,
      },
      spark: {
        code: `# Spark moves data between the JVM and Python workers in Arrow batches, not row by row JSON.
spark.conf.set("spark.sql.execution.arrow.pyspark.enabled", "true")

pandas_frame = frame.toPandas()                          # columnar Arrow transfer: much faster than collect()

# On disk and across the shuffle, prefer columnar binary formats:
frame.write.parquet("out/events")                         # compressed, columnar, typed
frame.write.json("out/events_json")                       # larger and slower; use for interchange only`,
      },
      rust: {
        code: `use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, PartialEq, Debug)]
struct Payload { values: Vec<f64> }

fn main() {
    let payload = Payload { values: vec![1.5; 1_000_000] };

    let json = serde_json::to_string(&payload).unwrap();             // text: parsed number by number
    let binary = bincode::serialize(&payload).unwrap();              // fixed-width binary
    println!("{} bytes of JSON, {} bytes of bincode", json.len(), binary.len());

    let back: Payload = bincode::deserialize(&binary).unwrap();
    assert_eq!(payload, back);

    // Zero-copy over FFI: no serialisation at all, just a pointer and a length.
    let (ptr, len) = (payload.values.as_ptr(), payload.values.len());
    let _ = (ptr, len);
}
// Requires serde, serde_json, bincode (1.x API shown). Protobuf: prost; Arrow: arrow-rs.`,
      },
      cpp: {
        code: `#include <cstdint>
#include <cstring>
#include <iostream>
#include <nlohmann/json.hpp>
#include <vector>

int main() {
    std::vector<double> values(1'000'000, 1.5);

    std::string text = nlohmann::json(values).dump();                // text encoding

    std::vector<std::uint8_t> bytes(values.size() * sizeof(double));
    std::memcpy(bytes.data(), values.data(), bytes.size());          // binary: a single memcpy
    std::vector<double> restored(values.size());
    std::memcpy(restored.data(), bytes.data(), bytes.size());

    std::cout << text.size() << " bytes of JSON, " << bytes.size() << " bytes raw\\n";
}
// Raw memcpy ties the format to this machine's endianness and struct layout. Use a schema-based
// format (Protocol Buffers, FlatBuffers, Cap'n Proto) when the other side is a different program.`,
      },
      go: {
        code: `import (
    "bytes"
    "encoding/binary"
    "encoding/json"
    "fmt"
)

func main() {
    values := make([]float64, 1_000_000)
    for i := range values {
        values[i] = 1.5
    }

    text, _ := json.Marshal(values) // text encoding; uses reflection

    var buffer bytes.Buffer
    binary.Write(&buffer, binary.LittleEndian, values) // fixed-width binary, explicit byte order
    restored := make([]float64, len(values))
    binary.Read(&buffer, binary.LittleEndian, restored)

    fmt.Println(len(text), buffer.Cap())
}
// Protocol Buffers (google.golang.org/protobuf) and gob are the usual schema-based and Go-only options.`,
      },
      swift: {
        code: `import Foundation

let values = [Double](repeating: 1.5, count: 1_000_000)

let json = try JSONEncoder().encode(values)                          // text
let decoded = try JSONDecoder().decode([Double].self, from: json)

let binary = values.withUnsafeBytes { Data($0) }                     // raw bytes: 8 per element
let restored = binary.withUnsafeBytes { Array($0.bindMemory(to: Double.self)) }

print(json.count, binary.count)

// Property lists have a binary form too:  let encoder = PropertyListEncoder(); encoder.outputFormat = .binary
// Raw bytes assume matching endianness and alignment; use a schema (protobuf) between different programs.`,
      },
      kotlin: {
        code: `import kotlinx.serialization.ExperimentalSerializationApi
import kotlinx.serialization.Serializable
import kotlinx.serialization.cbor.Cbor
import kotlinx.serialization.decodeFromByteArray
import kotlinx.serialization.encodeToByteArray
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json
import java.nio.ByteBuffer

@Serializable data class Payload(val values: List<Double>)

@OptIn(ExperimentalSerializationApi::class)
fun main() {
    val payload = Payload(List(1_000_000) { 1.5 })

    val json = Json.encodeToString(payload)                            // text
    val cbor = Cbor.encodeToByteArray(payload)                         // compact binary
    val back = Cbor.decodeFromByteArray<Payload>(cbor)

    val raw = ByteBuffer.allocate(payload.values.size * 8)             // hand-rolled fixed-width binary
    payload.values.forEach(raw::putDouble)

    println("\${json.length} chars of JSON, \${cbor.size} bytes of CBOR, \${raw.capacity()} raw bytes")
}
// Requires kotlinx-serialization-json and -cbor. Protobuf: kotlinx-serialization-protobuf or protobuf-kotlin.`,
      },
    },
    takeaway:
      'Measure before choosing: JSON is fine for small, human-facing payloads; large numeric arrays want a binary or columnar format; and an in-process FFI call that shares memory has no serialization cost at all.',
  },
  {
    id: 'failure-boundary',
    part: 'interop',
    navLabel: 'Failure boundaries',
    title: 'Failure across the boundary',
    summary:
      'Across FFI, a panic, segfault, or leaked pointer affects the whole process, and no exception travels safely through a C boundary. Across a network, the callee is isolated but can be slow, down, or wrong, so callers add timeouts, retries, and circuit breakers.',
    snippets: {
      sql: {
        code: `-- In-process: a bug in a C extension can crash the whole backend (all sessions drop and recover).
-- Out-of-process: a failing procedural language or remote call raises an error you can handle.
DO $$
BEGIN
  PERFORM risky_remote_call();               -- hypothetical
EXCEPTION
  WHEN query_canceled THEN RAISE NOTICE 'timed out';
  WHEN OTHERS         THEN RAISE NOTICE 'failed: %', SQLERRM;
END $$;

SET statement_timeout = '2s';                -- a deadline for any statement`,
      },
      python: {
        code: `import ctypes
import time
import httpx

# FFI: the Python interpreter and the C library share one process.
lib = ctypes.CDLL("./libcore.so")
# lib.sum_f64(None, 10)    # a bad pointer: segmentation fault, the interpreter dies (no exception)
# Enable faulthandler to get a traceback on a crash:  python -X faulthandler app.py

# Network: failures are values or exceptions you can handle, retry, and bound.
def call_with_retry(url: str, payload: dict, attempts: int = 3) -> dict:
    delay = 0.2
    for attempt in range(1, attempts + 1):
        try:
            response = httpx.post(url, json=payload, timeout=3.0)
            response.raise_for_status()
            return response.json()
        except (httpx.TransportError, httpx.HTTPStatusError) as error:
            if attempt == attempts or isinstance(error, httpx.HTTPStatusError) and error.response.status_code < 500:
                raise                                     # only retry transient errors
            time.sleep(delay)
            delay *= 2                                    # exponential back-off (add random jitter in production)
    raise AssertionError("unreachable")`,
      },
      typescript: {
        code: `// FFI (koffi / N-API): native code runs in the Node.js process. A segfault ends the process,
// and JavaScript try/catch cannot catch it. Run risky native code in a worker thread or child
// process so the main process survives:
import { Worker } from "node:worker_threads";
const worker = new Worker("./native-worker.js");
worker.on("exit", (code) => { if (code !== 0) console.error("native worker died; restart it"); });

// Network: bounded retry with back-off, and only for errors worth retrying.
async function callWithRetry<T>(url: string, body: unknown, attempts = 3): Promise<T> {
  let delay = 200;
  for (let attempt = 1; ; attempt++) {
    try {
      const response = await fetch(url, { method: "POST", body: JSON.stringify(body), signal: AbortSignal.timeout(3000) });
      if (response.status >= 500) throw new Error(\`HTTP \${response.status}\`);   // retryable
      if (!response.ok) throw Object.assign(new Error(\`HTTP \${response.status}\`), { fatal: true });
      return (await response.json()) as T;
    } catch (error) {
      if (attempt >= attempts || (error as { fatal?: boolean }).fatal) throw error;
      await new Promise((resolve) => setTimeout(resolve, delay));
      delay *= 2;
    }
  }
}`,
      },
      spark: {
        code: `# A native-library crash kills the Python worker; Spark reschedules the task elsewhere.
spark.conf.set("spark.task.maxFailures", "4")           # attempts before the whole job fails
spark.conf.set("spark.python.worker.faulthandler.enabled", "true")

# Remote calls from tasks need their own guard rails, because a retried task repeats its calls:
# make the call idempotent (use a request id), set timeouts, and cap concurrency.
# An exhausted task shows up on the driver as:  org.apache.spark.SparkException: Job aborted due to stage failure`,
      },
      rust: {
        code: `use std::panic::{catch_unwind, AssertUnwindSafe};

/// FFI entry point: a panic must NOT unwind into the C caller (undefined behaviour).
#[no_mangle]
pub unsafe extern "C" fn sum_f64_checked(data: *const f64, len: usize, out: *mut f64) -> i32 {
    if data.is_null() || out.is_null() { return -1; }              // error codes, not exceptions
    let result = catch_unwind(AssertUnwindSafe(|| {
        std::slice::from_raw_parts(data, len).iter().sum::<f64>()
    }));
    match result {
        Ok(total) => { *out = total; 0 }
        Err(_) => -2,                                              // the panic is contained
    }
}
// A bad pointer from the caller is still undefined behaviour: Rust cannot check what C passes in.
// Since Rust 1.81, a panic reaching an extern "C" function aborts the process rather than unwinding.

// Network: use timeouts, retries with back-off, and a circuit breaker (e.g. the tower crate: TimeoutLayer, RetryLayer).`,
      },
      cpp: {
        code: `#include <cstddef>
#include <exception>
#include <numeric>

// FFI entry point: catch every exception; one escaping an extern "C" function is undefined behaviour.
extern "C" int sum_f64_checked(const double* data, std::size_t len, double* out) {
    if (!data || !out) return -1;                      // validate pointers
    try {
        *out = std::accumulate(data, data + len, 0.0);
        return 0;
    } catch (const std::exception&) {
        return -2;                                     // map exceptions to error codes
    } catch (...) {
        return -3;
    }
}
// A dangling pointer or an out-of-range len is a crash the callee cannot detect.
// Run with  -fsanitize=address,undefined  in tests to catch the caller's mistakes early.

// Network: wrap calls in a deadline and a retry policy (Boost.Asio steady_timer, or the client library's own).`,
      },
      go: {
        code: `// cgo: a panic in Go code called from C is fatal, and a C crash kills the Go process.
// Guard exported functions:
//export SumChecked
func SumChecked(data *C.double, length C.size_t, out *C.double) (status C.int) {
    defer func() {
        if recover() != nil {
            status = -2 // never let a panic cross into C
        }
    }()
    if data == nil || out == nil {
        return -1
    }
    values := unsafe.Slice((*float64)(unsafe.Pointer(data)), int(length))
    total := 0.0
    for _, value := range values {
        total += value
    }
    *out = C.double(total)
    return 0
}

// Network: context deadlines, bounded retries with back-off and jitter, and a circuit breaker
// (for example sony/gobreaker) so a failing dependency is not hammered.
func callWithRetry(ctx context.Context, attempts int, call func(context.Context) error) error {
    delay := 200 * time.Millisecond
    var err error
    for attempt := 1; attempt <= attempts; attempt++ {
        attemptCtx, cancel := context.WithTimeout(ctx, 3*time.Second)
        err = call(attemptCtx)
        cancel()
        if err == nil || ctx.Err() != nil {
            return err
        }
        select {
        case <-time.After(delay + time.Duration(rand.Int63n(int64(delay)))):
        case <-ctx.Done():
            return ctx.Err()
        }
        delay *= 2
    }
    return err
}`,
      },
      swift: {
        code: `import Foundation

// FFI: a Swift error cannot be thrown through a C interface. Return a status code instead.
@_cdecl("sum_checked")
public func sumChecked(_ data: UnsafePointer<Double>?, _ length: Int, _ out: UnsafeMutablePointer<Double>?) -> Int32 {
    guard let data, let out, length >= 0 else { return -1 }
    out.pointee = UnsafeBufferPointer(start: data, count: length).reduce(0, +)
    return 0
}
// A force-unwrap or out-of-range index in Swift traps (crashes) the whole process.

// Network: structured retries with back-off, cancelled automatically with the task.
func callWithRetry<T>(attempts: Int = 3, _ operation: () async throws -> T) async throws -> T {
    var delay: UInt64 = 200_000_000                       // nanoseconds
    for attempt in 1...attempts {
        do { return try await operation() }
        catch where attempt < attempts && !(error is CancellationError) {
            try await Task.sleep(nanoseconds: delay)
            delay *= 2
        }
    }
    fatalError("unreachable")
}`,
      },
      kotlin: {
        code: `import kotlinx.coroutines.*
import java.lang.foreign.MemorySegment

// FFI (Foreign Function & Memory API or JNI): a native crash terminates the JVM; a Java exception
// cannot cross the native frame. Keep native calls behind a narrow wrapper that returns a result:
class NativeSum(private val handle: (MemorySegment, Long) -> Double) {
    fun sum(segment: MemorySegment, length: Long): Result<Double> = runCatching {
        require(length >= 0) { "length must not be negative" }
        handle(segment, length)
    }
}

// Network: a timeout and bounded retries with exponential back-off.
suspend fun <T> retry(attempts: Int = 3, block: suspend () -> T): T {
    var delayMs = 200L
    repeat(attempts - 1) {
        try { return withTimeout(3000) { block() } }
        catch (e: TimeoutCancellationException) { /* retry */ }
        catch (e: java.io.IOException) { /* retry */ }
        delay(delayMs)
        delayMs *= 2
    }
    return withTimeout(3000) { block() }                  // the last attempt propagates its failure
}`,
      },
    },
    takeaway:
      'Match the defence to the boundary. For FFI: validate inputs, return error codes, never let a panic or exception cross, and isolate risky native code in a separate process. For a network: set deadlines, retry only transient errors with back-off and jitter, and stop calling a failing dependency.',
  },
];
