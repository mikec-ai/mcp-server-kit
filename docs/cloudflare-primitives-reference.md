# Cloudflare Primitives Reference

**Comprehensive guide to Cloudflare Workers primitives for MCP server development**

This document provides detailed information about Cloudflare's developer platform primitives, their capabilities, use cases, and integration patterns for building MCP (Model Context Protocol) servers.

---

## Overview

Cloudflare Workers provides 8 key primitives that enable powerful distributed applications:

| Primitive | Type | Primary Use Case | Best For MCP Servers |
|-----------|------|------------------|---------------------|
| **Durable Objects** | Stateful compute | Real-time coordination, WebSockets | Session management, persistent state |
| **KV Namespaces** | Key-value store | Fast reads, caching | Configuration, cache, simple data |
| **D1 Database** | SQL database | Structured data, relations | User data, CRUD operations, queries |
| **R2 Storage** | Object storage | Files, media, large objects | File resources, media storage |
| **Queues** | Message queue | Async processing, buffering | Background jobs, event processing |
| **Workers AI** | ML inference | Text generation, embeddings | AI-powered tools, content generation |
| **Vectorize** | Vector database | Semantic search, similarity | RAG, knowledge base search |
| **Hyperdrive** | Connection pooling | External databases | External data integration, legacy DB |

---

## 1. Durable Objects

### What It Is

Durable Objects provide strongly consistent, stateful compute with:
- **Single-threaded execution** (no race conditions)
- **Persistent storage** (SQLite-backed or KV-based)
- **In-memory state** (survives between requests)
- **WebSocket support** (long-lived connections)
- **Alarms API** (scheduled execution)

### Current Status in mcp-server-kit

✅ **Already Configured** - The cloudflare-remote template uses Durable Objects via the `agents/mcp` SDK:
- `MCPServerAgent` class extends `McpAgent<Env>`
- Configured in `wrangler.jsonc` with migrations
- Provides MCP session persistence

### Architecture

```typescript
import { DurableObject } from "cloudflare:workers";

export class MyDurableObject extends DurableObject {
  sql: SqlStorage;

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    this.sql = ctx.storage.sql;

    // Initialize from storage
    ctx.blockConcurrencyWhile(async () => {
      // Load initial state
    });
  }

  async fetch(request: Request): Promise<Response> {
    // Handle requests with access to persistent storage
    await this.ctx.storage.put('key', 'value');
    return new Response('OK');
  }
}
```

### wrangler.jsonc Configuration

```jsonc
{
  "durable_objects": {
    "bindings": [
      {
        "name": "MY_OBJECT",
        "class_name": "MyDurableObject"
      }
    ]
  },
  "migrations": [
    {
      "tag": "v1",
      "new_sqlite_classes": ["MyDurableObject"]
    }
  ]
}
```

### Storage API

**SQLite API** (Recommended):
```typescript
// SQL operations
this.sql.exec(`CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY, name TEXT)`);
const result = this.sql.exec(`SELECT * FROM users WHERE id = ?`, id);

// KV-style operations (still available)
await this.ctx.storage.put('key', value);
const value = await this.ctx.storage.get('key');
```

**Key-Value API**:
```typescript
await this.ctx.storage.put('counter', 42);
const counter = await this.ctx.storage.get('counter'); // 42
await this.ctx.storage.delete('counter');
const all = await this.ctx.storage.list();
```

### Use Cases for MCP Servers

✅ **Session Management**: Track user sessions, conversation history
✅ **Real-time Coordination**: Multi-user collaboration, chat rooms
✅ **Stateful Tools**: Tools that maintain state across invocations
✅ **WebSocket Endpoints**: Streaming responses, live updates
✅ **Scheduled Tasks**: Using alarms for periodic operations

### Best Practices

- Use SQLite storage backend for new Durable Objects
- Initialize state in `blockConcurrencyWhile()` during construction
- Leverage in-memory state for performance (with storage backup)
- Use alarms for periodic tasks instead of external cron
- Keep Durable Object classes focused (single responsibility)

### Cost Considerations

- **Requests**: $0.15 per million requests
- **Duration**: $12.50 per million GB-seconds
- **Storage**: $0.20 per GB-month (30-day point-in-time recovery included)

---

## 2. KV Namespaces

### What It Is

Globally distributed key-value storage optimized for:
- **Fast reads** (edge caching, sub-50ms globally)
- **Eventual consistency** (writes propagate within 60 seconds)
- **Simple data** (25 MB value limit)
- **High scalability** (millions of operations per second)

### Architecture

```typescript
// Binding in wrangler.jsonc provides KVNamespace interface
await env.MY_KV.put(key, value, { expirationTtl: 3600 });
const value = await env.MY_KV.get(key);
await env.MY_KV.delete(key);
const list = await env.MY_KV.list({ prefix: 'user:' });
```

### wrangler.jsonc Configuration

```jsonc
{
  "kv_namespaces": [
    {
      "binding": "MY_KV",
      "id": "a1b2c3d4e5f6..."
    }
  ]
}
```

### API Methods

**Write Operations**:
```typescript
// Simple put
await env.KV.put('key', 'value');

// With metadata
await env.KV.put('key', 'value', {
  metadata: { userId: '123', tags: ['important'] },
  expirationTtl: 3600  // Expire in 1 hour
});

// Bulk operations (via CLI/API, not binding)
```

**Read Operations**:
```typescript
// Get value
const value = await env.KV.get('key'); // Returns string | null
const json = await env.KV.get('key', 'json'); // Parse as JSON
const buffer = await env.KV.get('key', 'arrayBuffer'); // Binary data

// Get with metadata
const { value, metadata } = await env.KV.getWithMetadata('key');

// List keys
const result = await env.KV.list({
  prefix: 'user:',
  limit: 100,
  cursor: nextCursor
});
```

### Use Cases for MCP Servers

✅ **Configuration Cache**: Store frequently accessed configuration
✅ **Session Tokens**: OAuth tokens, API keys (with expiration)
✅ **Rate Limiting**: Track request counts per user/IP
✅ **Feature Flags**: Dynamic feature toggles
✅ **Simple Resources**: Expose cached data as MCP resources

### Example: Configuration Resource

```typescript
// MCP resource using KV for configuration
server.resource(
  "app-config",
  "config://app",
  { description: "Application configuration" },
  async (uri) => {
    const config = await env.CONFIG_KV.get('app-config', 'json');
    return {
      contents: [{
        uri: uri.href,
        text: JSON.stringify(config, null, 2),
        mimeType: "application/json"
      }]
    };
  }
);
```

### Best Practices

- Use for read-heavy workloads (90%+ reads)
- Store metadata with values for efficient filtering
- Implement prefix-based key organization (`user:123:session`)
- Set TTL for temporary data (cache invalidation)
- Don't rely on immediate consistency for writes

### Limitations

- **Eventual consistency**: Writes take up to 60 seconds to propagate
- **Value size**: 25 MB maximum per value
- **No transactions**: Can't guarantee atomic multi-key operations
- **No query language**: Must use key-based access or list with prefix

### Cost Considerations

- **Reads**: $0.50 per 10 million reads
- **Writes**: $5.00 per million writes
- **Deletes**: $5.00 per million deletes
- **Storage**: $0.50 per GB-month
- **List operations**: $5.00 per million requests

---

## 3. D1 Database

### What It Is

Cloudflare's serverless SQL database built on SQLite:
- **SQL queries** (standard SQLite syntax)
- **Relational data** (tables, joins, foreign keys)
- **ACID transactions** (via batching)
- **Migrations** (managed via Wrangler)
- **Time Travel** (point-in-time recovery)

### Architecture

```typescript
// Query with parameters (prevents SQL injection)
const stmt = env.DB.prepare('SELECT * FROM users WHERE id = ?');
const result = await stmt.bind(userId).first();

// Execute multiple statements atomically
await env.DB.batch([
  env.DB.prepare('INSERT INTO users (name) VALUES (?)').bind('Alice'),
  env.DB.prepare('INSERT INTO users (name) VALUES (?)').bind('Bob')
]);
```

### wrangler.jsonc Configuration

```jsonc
{
  "d1_databases": [
    {
      "binding": "DB",
      "database_name": "my-database",
      "database_id": "a1b2c3d4-...",
      "migrations_dir": "migrations"
    }
  ]
}
```

### API Methods

**Prepared Statements**:
```typescript
// Single row
const user = await env.DB.prepare('SELECT * FROM users WHERE id = ?')
  .bind(123)
  .first();

// All rows
const users = await env.DB.prepare('SELECT * FROM users')
  .all();

// Run (for INSERT/UPDATE/DELETE)
const result = await env.DB.prepare('INSERT INTO users (name) VALUES (?)')
  .bind('Alice')
  .run();
// result.meta: { changes: 1, last_row_id: 42 }
```

**Batch Operations**:
```typescript
const results = await env.DB.batch([
  env.DB.prepare('INSERT INTO users (name) VALUES (?)').bind('Alice'),
  env.DB.prepare('SELECT * FROM users'),
  env.DB.prepare('UPDATE users SET active = 1 WHERE id = ?').bind(42)
]);
```

**Handling Results**:
```typescript
const result = await stmt.all();
// result.results: Array of rows
// result.success: boolean
// result.meta: { changes, duration, last_row_id, rows_read, rows_written }
```

### Migrations

```bash
# Create migration
npx wrangler d1 migrations create my-database add_users_table

# Apply locally
npx wrangler d1 migrations apply my-database --local

# Apply to production
npx wrangler d1 migrations apply my-database --remote
```

Example migration file (`migrations/0001_add_users_table.sql`):
```sql
-- Create users table
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  created_at INTEGER DEFAULT (strftime('%s', 'now'))
);

-- Create index
CREATE INDEX idx_users_email ON users(email);
```

### Use Cases for MCP Servers

✅ **User Data**: Store user profiles, preferences, history
✅ **CRUD Tools**: Database-backed tools for data management
✅ **Query Tools**: Dynamic SQL queries via MCP tools
✅ **Structured Resources**: Expose database records as resources
✅ **Audit Logs**: Track tool invocations, user actions

### Example: User Lookup Tool

```typescript
server.tool(
  "user-lookup",
  "Find user by email",
  { email: z.string().email() },
  async ({ email }) => {
    const user = await env.DB.prepare(
      'SELECT id, name, email, created_at FROM users WHERE email = ?'
    ).bind(email).first();

    if (!user) {
      throw new Error(`User not found: ${email}`);
    }

    return {
      content: [{
        type: "text",
        text: JSON.stringify(user, null, 2)
      }]
    };
  }
);
```

### Best Practices

- Use migrations for schema changes (version-controlled)
- Always use prepared statements with `.bind()` (prevents SQL injection)
- Batch multiple operations for atomicity
- Create indexes for frequently queried columns
- Use foreign keys for referential integrity
- Set appropriate `PRAGMA` settings in migrations

### Limitations

- **Database size**: 10 GB maximum (per database)
- **Query execution time**: 30 seconds maximum
- **Concurrent operations**: Limited by Workers concurrency
- **No full-text search**: (FTS5 virtual tables not supported for export)

### Cost Considerations

- **Free Tier**: 25 billion rows read, 50 million rows written per month
- **Paid**: $0.001 per million rows read, $1.00 per million rows written
- **Storage**: Included (up to 10 GB per database)

---

## 4. R2 Storage

### What It Is

Object storage compatible with S3 API:
- **Large objects** (unlimited size, no egress fees)
- **S3-compatible** (use existing S3 tools/SDKs)
- **Metadata** (custom key-value pairs per object)
- **Storage classes** (Standard, Infrequent Access)

### Architecture

```typescript
// Put object
await env.MY_BUCKET.put('path/to/file.txt', fileData, {
  httpMetadata: {
    contentType: 'text/plain',
    cacheControl: 'public, max-age=3600'
  },
  customMetadata: {
    userId: '123',
    uploadedAt: new Date().toISOString()
  }
});

// Get object
const object = await env.MY_BUCKET.get('path/to/file.txt');
const text = await object.text();
```

### wrangler.jsonc Configuration

```jsonc
{
  "r2_buckets": [
    {
      "binding": "MY_BUCKET",
      "bucket_name": "my-bucket"
    }
  ]
}
```

### API Methods

**Write Operations**:
```typescript
// Put object
await env.BUCKET.put(key, value, {
  httpMetadata: {
    contentType: 'application/json',
    contentEncoding: 'gzip',
    contentDisposition: 'attachment; filename="data.json"',
    cacheControl: 'public, max-age=3600'
  },
  customMetadata: {
    author: 'user-123',
    version: '1.0'
  }
});

// Multipart upload (for large files)
const upload = await env.BUCKET.createMultipartUpload(key);
// ... upload parts
await upload.complete(parts);
```

**Read Operations**:
```typescript
// Get object
const object = await env.BUCKET.get(key);
if (object === null) {
  // Object not found
}

// Read body
const text = await object.text();
const json = await object.json();
const arrayBuffer = await object.arrayBuffer();
const blob = await object.blob();

// Stream body
const stream = object.body; // ReadableStream

// Get metadata only
const object = await env.BUCKET.head(key);
```

**List Operations**:
```typescript
// List objects
const listed = await env.BUCKET.list({
  prefix: 'uploads/',
  limit: 1000,
  delimiter: '/'
});

for (const obj of listed.objects) {
  console.log(obj.key, obj.size, obj.uploaded);
}
```

**Delete Operations**:
```typescript
await env.BUCKET.delete(key);
await env.BUCKET.delete([key1, key2, key3]); // Bulk delete
```

### Use Cases for MCP Servers

✅ **File Upload/Download Tools**: Let users store/retrieve files
✅ **Media Resources**: Expose stored files as MCP resources
✅ **Document Storage**: PDF, images, archives
✅ **Backup/Export**: Export data from MCP tools to R2
✅ **Large Payloads**: Store large responses, retrieve via signed URLs

### Example: File Upload Tool

```typescript
server.tool(
  "upload-file",
  "Upload a file to R2 storage",
  {
    filename: z.string(),
    content: z.string(), // base64-encoded
    mimeType: z.string().optional()
  },
  async ({ filename, content, mimeType }) => {
    const buffer = Buffer.from(content, 'base64');

    await env.FILES.put(`uploads/${filename}`, buffer, {
      httpMetadata: {
        contentType: mimeType || 'application/octet-stream'
      },
      customMetadata: {
        uploadedAt: new Date().toISOString(),
        size: buffer.length.toString()
      }
    });

    return {
      content: [{
        type: "text",
        text: `File uploaded: ${filename} (${buffer.length} bytes)`
      }]
    };
  }
);
```

### Best Practices

- Organize objects with consistent key patterns (`user-123/avatar.jpg`)
- Set appropriate `Content-Type` headers
- Use custom metadata for searchability
- Implement lifecycle policies for old objects
- Use multipart upload for files >100 MB

### Limitations

- **Object size**: 5 TB maximum per object
- **PUT request size**: 5 GB maximum (use multipart for larger)
- **List pagination**: 1,000 objects per request
- **Custom metadata**: 2 KB maximum per object

### Cost Considerations

- **Storage**: $0.015 per GB-month (Standard), $0.01 per GB-month (Infrequent Access)
- **Class A operations** (write): $4.50 per million
- **Class B operations** (read): $0.36 per million
- **Egress**: $0 (no data transfer fees)

---

## 5. Queues

### What It Is

Message queue for asynchronous processing:
- **Producer/Consumer** pattern
- **Batching** (configurable batch size and timeout)
- **Retry logic** (automatic retries, dead letter queues)
- **Guaranteed delivery** (at-least-once)

### Architecture

**Producer** (send messages):
```typescript
// Single message
await env.MY_QUEUE.send({ userId: 123, action: 'signup' });

// Batch messages
await env.MY_QUEUE.sendBatch([
  { body: { userId: 1 } },
  { body: { userId: 2 } },
  { body: { userId: 3 } }
]);
```

**Consumer** (receive messages):
```typescript
export default {
  async queue(batch: MessageBatch, env: Env): Promise<void> {
    for (const message of batch.messages) {
      const { userId, action } = message.body;

      try {
        await processUser(userId, action);
        message.ack(); // Mark as successfully processed
      } catch (error) {
        message.retry(); // Retry this message
      }
    }
  }
};
```

### wrangler.jsonc Configuration

**Producer**:
```jsonc
{
  "queues": {
    "producers": [
      {
        "binding": "MY_QUEUE",
        "queue": "my-queue-name"
      }
    ]
  }
}
```

**Consumer**:
```jsonc
{
  "queues": {
    "consumers": [
      {
        "queue": "my-queue-name",
        "max_batch_size": 10,
        "max_batch_timeout": 5
      }
    ]
  }
}
```

### API Methods

**Producer API**:
```typescript
// Send single message
await env.QUEUE.send(messageBody, {
  contentType: 'json' // or 'text', 'bytes', 'v8'
});

// Send batch
await env.QUEUE.sendBatch([
  { body: { id: 1 }, contentType: 'json' },
  { body: 'text message', contentType: 'text' }
]);
```

**Consumer API**:
```typescript
interface Message {
  id: string;
  timestamp: Date;
  body: any;
  attempts: number;
  ack(): void;
  retry(options?: { delaySeconds?: number }): void;
  retryAll(): void;
}

interface MessageBatch {
  queue: string;
  messages: Message[];
  ackAll(): void;
  retryAll(): void;
}
```

### Use Cases for MCP Servers

✅ **Background Jobs**: Long-running tasks triggered by tools
✅ **Event Processing**: Async event handling, webhooks
✅ **Rate Limiting**: Buffer requests to external APIs
✅ **Batch Operations**: Aggregate operations before processing
✅ **Workflows**: Multi-step processes across multiple tools

### Example: Email Queue

```typescript
// Tool: Send email (producer)
server.tool(
  "send-email",
  "Queue an email to be sent",
  {
    to: z.string().email(),
    subject: z.string(),
    body: z.string()
  },
  async ({ to, subject, body }) => {
    await env.EMAIL_QUEUE.send({
      to,
      subject,
      body,
      timestamp: Date.now()
    });

    return {
      content: [{
        type: "text",
        text: "Email queued for delivery"
      }]
    };
  }
);

// Consumer Worker (separate file)
export default {
  async queue(batch: MessageBatch, env: Env): Promise<void> {
    for (const msg of batch.messages) {
      const { to, subject, body } = msg.body;

      try {
        await sendEmailViaProvider(to, subject, body);
        msg.ack();
      } catch (error) {
        console.error('Failed to send email:', error);
        if (msg.attempts < 3) {
          msg.retry({ delaySeconds: 60 });
        }
      }
    }
  }
};
```

### Best Practices

- Set appropriate batch size based on processing time
- Use explicit `ack()` or `retry()` for granular control
- Implement idempotency (messages may be delivered multiple times)
- Monitor queue depth and consumer lag
- Use dead letter queues for persistent failures

### Limitations

- **Message size**: 128 KB maximum per message
- **Batch size**: 100 messages maximum per batch
- **Retention**: 4 days maximum
- **Delivery guarantee**: At-least-once (may receive duplicates)

### Cost Considerations

- **Operations**: $0.40 per million operations
- **No storage cost** (messages automatically deleted after processing)

---

## 6. Workers AI

### What It Is

Run machine learning models on Cloudflare's network:
- **Text generation** (LLMs: Llama, Mistral, etc.)
- **Text embeddings** (vector representations)
- **Text classification** (sentiment, categorization)
- **Image classification** (object detection)
- **No GPUs needed** (serverless inference)

### Architecture

```typescript
// Text generation
const response = await env.AI.run('@cf/meta/llama-3.1-8b-instruct', {
  prompt: 'What is the meaning of life?'
});

// Text embeddings
const embeddings = await env.AI.run('@cf/baai/bge-base-en-v1.5', {
  text: ['Hello world', 'Machine learning']
});

// Streaming
const stream = await env.AI.run('@cf/meta/llama-3.1-8b-instruct', {
  prompt: 'Tell me a story',
  stream: true
});
```

### wrangler.jsonc Configuration

```jsonc
{
  "ai": {
    "binding": "AI"
  }
}
```

### API Methods

**Text Generation**:
```typescript
const result = await env.AI.run('@cf/meta/llama-3.1-8b-instruct', {
  messages: [
    { role: 'system', content: 'You are a helpful assistant' },
    { role: 'user', content: 'What is TypeScript?' }
  ],
  stream: false
});
```

**Text Embeddings**:
```typescript
const embeddings = await env.AI.run('@cf/baai/bge-base-en-v1.5', {
  text: ['Document 1', 'Document 2', 'Query text']
});
// Returns: { data: [[0.1, 0.2, ...], ...], shape: [3, 768] }
```

**Streaming**:
```typescript
const stream = await env.AI.run(model, { ...params, stream: true });

// Return as ReadableStream
return new Response(stream, {
  headers: { 'Content-Type': 'text/event-stream' }
});
```

### Available Models

**Text Generation**:
- `@cf/meta/llama-3.1-8b-instruct` - Fast, high quality
- `@cf/meta/llama-3-8b-instruct` - Balanced performance
- `@cf/mistral/mistral-7b-instruct-v0.1` - Efficient

**Text Embeddings**:
- `@cf/baai/bge-base-en-v1.5` - 768 dimensions, English
- `@cf/baai/bge-small-en-v1.5` - 384 dimensions, faster

**Image Classification**:
- `@cf/microsoft/resnet-50` - Image recognition

### Use Cases for MCP Servers

✅ **AI Assistant Tools**: Conversational tools powered by LLMs
✅ **Content Generation**: Generate text, summaries, translations
✅ **Semantic Search**: Generate embeddings for RAG
✅ **Classification**: Categorize user input, detect sentiment
✅ **Streaming Responses**: Real-time AI responses via SSE

### Example: AI Text Generation Tool

```typescript
server.tool(
  "ai-generate",
  "Generate text using AI",
  {
    prompt: z.string(),
    model: z.string().optional()
  },
  async ({ prompt, model }) => {
    const result = await env.AI.run(
      model || '@cf/meta/llama-3.1-8b-instruct',
      { prompt }
    );

    return {
      content: [{
        type: "text",
        text: result.response
      }]
    };
  }
);
```

### Best Practices

- Choose appropriate model for task (speed vs quality)
- Use streaming for long responses (better UX)
- Cache embeddings (expensive to regenerate)
- Set reasonable token limits
- Handle model errors gracefully

### Limitations

- **Request timeout**: 30 seconds for Workers, 15 minutes for Workflows
- **Token limits**: Varies by model (typically 2048-8192 tokens)
- **Concurrent requests**: Subject to account limits
- **Model availability**: Models may be deprecated

### Cost Considerations

- **Free Tier**: 10,000 neurons per day
- **Neurons**: Unit of compute (varies by model complexity)
- Typical costs: ~1 neuron per 100 tokens

---

## 7. Vectorize

### What It Is

Vector database for semantic search and AI:
- **Store vectors** (embeddings from ML models)
- **Similarity search** (find similar vectors)
- **Metadata filtering** (combine with filters)
- **Optimized for AI** (RAG, recommendations)

### Architecture

```typescript
// Insert vectors
await env.VECTOR_INDEX.upsert([
  {
    id: '1',
    values: [0.1, 0.2, 0.3, ...], // 768-dimensional vector
    metadata: { title: 'Document 1', category: 'tech' }
  }
]);

// Query similar vectors
const results = await env.VECTOR_INDEX.query(queryVector, {
  topK: 5,
  returnMetadata: 'all',
  filter: { category: 'tech' }
});
```

### wrangler.jsonc Configuration

```jsonc
{
  "vectorize": [
    {
      "binding": "VECTOR_INDEX",
      "index_name": "my-embeddings"
    }
  ]
}
```

### API Methods

**Insert Vectors**:
```typescript
await env.INDEX.upsert([
  {
    id: 'doc-1',
    values: embeddings,
    metadata: {
      title: 'Introduction to AI',
      author: 'Alice',
      tags: ['ai', 'ml']
    }
  }
]);
```

**Query Vectors**:
```typescript
const results = await env.INDEX.query(queryVector, {
  topK: 10, // Return top 10 results
  returnMetadata: 'all', // Include metadata
  returnValues: false, // Don't return vector values
  filter: { author: 'Alice' } // Metadata filter
});

// results.matches: Array of { id, score, metadata? }
```

**Delete Vectors**:
```typescript
await env.INDEX.deleteByIds(['doc-1', 'doc-2']);
```

**Get by IDs**:
```typescript
const vectors = await env.INDEX.getByIds(['doc-1', 'doc-2']);
```

### Use Cases for MCP Servers

✅ **RAG (Retrieval Augmented Generation)**: Enhance AI with knowledge base
✅ **Semantic Search**: Find similar documents, code snippets
✅ **Recommendations**: Suggest related content
✅ **Knowledge Base**: Store and retrieve documentation
✅ **Question Answering**: Find relevant context for questions

### Example: RAG Search Tool

```typescript
server.tool(
  "knowledge-search",
  "Search knowledge base using semantic search",
  { query: z.string() },
  async ({ query }) => {
    // 1. Generate embedding for query
    const embedding = await env.AI.run('@cf/baai/bge-base-en-v1.5', {
      text: [query]
    });

    // 2. Query vector database
    const results = await env.VECTORS.query(embedding.data[0], {
      topK: 5,
      returnMetadata: 'all'
    });

    // 3. Fetch full documents from D1
    const docIds = results.matches.map(m => m.id);
    const docs = await env.DB.prepare(
      `SELECT * FROM documents WHERE id IN (${docIds.map(() => '?').join(',')})`
    ).bind(...docIds).all();

    // 4. Generate answer with context
    const context = docs.results.map(d => d.content).join('\n\n');
    const answer = await env.AI.run('@cf/meta/llama-3.1-8b-instruct', {
      messages: [
        { role: 'system', content: 'Answer using the provided context.' },
        { role: 'user', content: `Context:\n${context}\n\nQuestion: ${query}` }
      ]
    });

    return {
      content: [{
        type: "text",
        text: answer.response
      }]
    };
  }
);
```

### Best Practices

- Use consistent embedding model (same for indexing and querying)
- Store metadata for filtering and context
- Batch upsert operations (up to 1000 vectors)
- Normalize vectors before storing (if needed by model)
- Use namespaces for multi-tenant applications

### Limitations

- **Vector dimensions**: Depends on index configuration (384, 768, 1536, etc.)
- **Metadata size**: 10 KB maximum per vector
- **Batch size**: 1000 vectors per upsert
- **Index size**: Subject to account limits

### Cost Considerations

- **Free Tier**: 5 million queried vector dimensions, 10 million stored dimensions per month
- **Paid**: $0.04 per million queried dimensions, $0.05 per million stored dimensions per month

---

## 8. Hyperdrive

### What It Is

Connection pooling and caching for external databases:
- **PostgreSQL/MySQL** support
- **Connection pooling** (reduces handshake overhead)
- **Query caching** (automatic read query caching)
- **Global distribution** (pools at edge locations)

### Architecture

```typescript
// Use Hyperdrive connection string
import { Client } from 'pg';

const client = new Client({
  connectionString: env.HYPERDRIVE.connectionString
});

await client.connect();
const result = await client.query('SELECT * FROM users');
await client.end();
```

### wrangler.jsonc Configuration

```jsonc
{
  "hyperdrive": [
    {
      "binding": "HYPERDRIVE",
      "id": "a1b2c3d4..."
    }
  ]
}
```

### Setup

```bash
# Create Hyperdrive configuration
npx wrangler hyperdrive create my-postgres \
  --connection-string="postgres://user:pass@host:5432/db"

# Get connection details
npx wrangler hyperdrive get <hyperdrive-id>
```

### Use Cases for MCP Servers

✅ **Legacy Database Integration**: Connect to existing PostgreSQL/MySQL
✅ **External Data Sources**: Access data not in Cloudflare
✅ **Hybrid Architecture**: Mix Cloudflare and traditional databases
✅ **Migration Path**: Gradually migrate to Cloudflare primitives

### Example: External Database Query

```typescript
import { Client } from 'pg';

server.tool(
  "external-user-lookup",
  "Query external PostgreSQL database",
  { userId: z.number() },
  async ({ userId }) => {
    const client = new Client({
      connectionString: env.HYPERDRIVE.connectionString
    });

    await client.connect();
    const result = await client.query(
      'SELECT * FROM users WHERE id = $1',
      [userId]
    );
    await client.end();

    return {
      content: [{
        type: "text",
        text: JSON.stringify(result.rows[0], null, 2)
      }]
    };
  }
);
```

### Best Practices

- Use connection pooling (pg.Pool) for multiple parallel queries
- Leverage automatic query caching (reads are cached by default)
- Set appropriate cache TTL in Hyperdrive config
- Use for databases outside Cloudflare network
- Monitor connection pool usage

### Limitations

- **Supported databases**: PostgreSQL, MySQL, and compatible
- **Connection timeout**: Subject to Workers timeout limits
- **TLS required**: Plain text connections not supported
- **No DDL caching**: CREATE/ALTER/DROP not cached

### Cost Considerations

- **Included in Workers** Paid plan ($5/month)
- **No additional cost** for Hyperdrive usage

---

## Choosing the Right Primitive

### Decision Tree

```
Need to store data?
├─ Small, simple key-value (<25MB)
│  └─ KV Namespace (fast reads, eventual consistency)
├─ Structured, relational data
│  └─ D1 Database (SQL, ACID transactions)
├─ Large files, media (>25MB)
│  └─ R2 Storage (S3-compatible, no egress fees)
└─ External database
   └─ Hyperdrive (connection pooling, caching)

Need processing?
├─ Real-time, stateful, WebSockets
│  └─ Durable Objects (strongly consistent)
├─ Async, background jobs
│  └─ Queues (batching, retries)
└─ AI/ML inference
   └─ Workers AI (text generation, embeddings)

Need search?
├─ Semantic, similarity-based
│  └─ Vectorize (vector database, RAG)
└─ Full-text, SQL queries
   └─ D1 Database (with indexes)
```

### Cost Comparison

For **1 million operations**:

| Primitive | Read Cost | Write Cost | Storage Cost (per GB-month) |
|-----------|-----------|------------|---------------------------|
| KV | $0.05 | $5.00 | $0.50 |
| D1 | $0.001 | $1.00 | Included (up to 10GB) |
| R2 | $0.36 | $4.50 | $0.015 |
| Durable Objects | $0.15 per million requests | $0.20 |
| Queues | $0.40 per million ops | N/A |
| Workers AI | Varies by model (neurons) | N/A |
| Vectorize | $0.04 per million dimensions queried | $0.05 per million dimensions stored |

### Performance Characteristics

| Primitive | Latency | Consistency | Scalability |
|-----------|---------|-------------|-------------|
| KV | <50ms (edge cached) | Eventual (60s) | Very High |
| D1 | 10-100ms | Strong (per database) | High |
| R2 | 10-200ms | Strong | Very High |
| Durable Objects | 10-100ms | Strong (per object) | High |
| Queues | Async | N/A | Very High |
| Workers AI | 100-5000ms | N/A | High |
| Vectorize | 10-100ms | Strong | High |
| Hyperdrive | Depends on origin DB | Depends on origin DB | Medium |

---

## Integration Patterns

### Pattern: Full-Stack RAG Application

Combines: **Workers AI** + **Vectorize** + **D1** + **Queues**

```typescript
// 1. Document ingestion tool (producer)
server.tool("ingest-document", ..., async ({ text, title }) => {
  // Queue for async processing
  await env.INGEST_QUEUE.send({ text, title });
  return { content: [{ type: "text", text: "Document queued" }] };
});

// 2. Queue consumer (background)
async queue(batch: MessageBatch, env: Env) {
  for (const msg of batch.messages) {
    const { text, title } = msg.body;

    // Generate embedding
    const embedding = await env.AI.run('@cf/baai/bge-base-en-v1.5', {
      text: [text]
    });

    // Store in D1
    const result = await env.DB.prepare(
      'INSERT INTO documents (title, content) VALUES (?, ?)'
    ).bind(title, text).run();

    // Store vector
    await env.VECTORS.upsert([{
      id: result.meta.last_row_id.toString(),
      values: embedding.data[0],
      metadata: { title }
    }]);

    msg.ack();
  }
}

// 3. Search tool
server.tool("search-docs", ..., async ({ query }) => {
  // Generate query embedding
  const queryEmbedding = await env.AI.run('@cf/baai/bge-base-en-v1.5', {
    text: [query]
  });

  // Query vectors
  const results = await env.VECTORS.query(queryEmbedding.data[0], {
    topK: 5
  });

  // Fetch documents
  const docIds = results.matches.map(m => m.id);
  const docs = await env.DB.prepare(
    `SELECT * FROM documents WHERE id IN (${docIds.map(() => '?').join(',')})`
  ).bind(...docIds).all();

  // Generate answer
  const context = docs.results.map(d => d.content).join('\n\n');
  const answer = await env.AI.run('@cf/meta/llama-3.1-8b-instruct', {
    messages: [
      { role: 'system', content: 'Answer using context provided.' },
      { role: 'user', content: `Context:\n${context}\n\nQuestion: ${query}` }
    ]
  });

  return {
    content: [{ type: "text", text: answer.response }]
  };
});
```

### Pattern: Cached API with Rate Limiting

Combines: **KV** + **D1** + **Durable Objects**

```typescript
// Rate limiting with Durable Objects
export class RateLimiter extends DurableObject {
  async checkLimit(key: string, limit: number): Promise<boolean> {
    const count = (await this.ctx.storage.get<number>(key)) || 0;
    if (count >= limit) return false;

    await this.ctx.storage.put(key, count + 1, {
      expirationTtl: 3600 // 1 hour window
    });
    return true;
  }
}

// Tool with caching and rate limiting
server.tool("api-fetch", ..., async ({ endpoint }, env, ctx) => {
  // Check rate limit
  const limiterId = env.RATE_LIMITER.idFromName('global');
  const limiter = env.RATE_LIMITER.get(limiterId);
  const allowed = await limiter.checkLimit('api-calls', 100);

  if (!allowed) {
    throw new Error('Rate limit exceeded');
  }

  // Check cache
  const cached = await env.CACHE_KV.get(endpoint, 'json');
  if (cached) {
    return { content: [{ type: "text", text: JSON.stringify(cached) }] };
  }

  // Fetch from API
  const response = await fetch(endpoint);
  const data = await response.json();

  // Cache result
  await env.CACHE_KV.put(endpoint, JSON.stringify(data), {
    expirationTtl: 300 // 5 minutes
  });

  // Log to D1
  await env.DB.prepare(
    'INSERT INTO api_logs (endpoint, timestamp) VALUES (?, ?)'
  ).bind(endpoint, Date.now()).run();

  return { content: [{ type: "text", text: JSON.stringify(data) }] };
});
```

---

## Summary

Cloudflare provides a comprehensive suite of primitives for building distributed applications:

1. **Durable Objects** - Stateful compute, WebSockets, consistency
2. **KV** - Fast reads, caching, configuration
3. **D1** - SQL database, structured data
4. **R2** - Object storage, large files
5. **Queues** - Async processing, background jobs
6. **Workers AI** - ML inference, embeddings
7. **Vectorize** - Vector search, RAG
8. **Hyperdrive** - External database pooling

**Next Steps**:
- Review architecture analysis: `cloudflare-architecture-analysis.md`
- See implementation plan: `cloudflare-primitives-implementation-plan.md`
- Check agent skill guide: `templates/.../CLOUDFLARE-BINDINGS.md`
