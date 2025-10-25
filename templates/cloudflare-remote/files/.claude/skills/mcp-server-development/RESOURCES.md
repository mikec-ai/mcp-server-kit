# Resources - Complete Development Guide

Resources expose data via URIs for reading. They can be static (fixed) or dynamic (parameterized).

## Resource Anatomy

```typescript
server.resource(
  "resource-name",
  "resource://uri/pattern",
  {
    description: "What this resource provides",
    mimeType: "application/json"
  },
  async (uri) => {
    return {
      contents: [{
        uri: uri.href,
        text: "content here",
        mimeType: "application/json"
      }]
    };
  }
);
```

## Static Resources

Fixed URIs that return consistent content.

### Configuration Resource
```typescript
server.resource(
  "app-config",
  "config://app/settings",
  {
    description: "Application configuration",
    mimeType: "application/json"
  },
  async (uri) => {
    const config = {
      version: "1.0.0",
      features: { auth: true, debug: false },
      limits: { maxSize: 1048576 }
    };
    
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

### Documentation Resource
```typescript
server.resource(
  "api-docs",
  "docs://api/reference",
  {
    description: "API documentation",
    mimeType: "text/markdown"
  },
  async (uri) => {
    const docs = `# API Reference

## Endpoints

### GET /users
Returns list of users...`;
    
    return {
      contents: [{
        uri: uri.href,
        text: docs,
        mimeType: "text/markdown"
      }]
    };
  }
);
```

## Dynamic Resources (URI Templates)

Use `ResourceTemplate` for parameterized URIs.

### Single Parameter
```typescript
import { ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";

server.resource(
  "user-profile",
  new ResourceTemplate("user://{userId}", {
    list: async () => {
      const users = await fetchAllUsers();
      return {
        resources: users.map(u => ({
          uri: `user://${u.id}`,
          name: `user_${u.id}`,
          description: `Profile for ${u.name}`,
          mimeType: "application/json"
        }))
      };
    },
    complete: {
      userId: async (value) => {
        const userIds = await searchUsers(value);
        return userIds;
      }
    }
  }),
  {
    description: "User profile data",
    mimeType: "application/json"
  },
  async (uri, variables) => {
    const userId = variables.userId as string;
    const user = await fetchUser(userId);
    
    if (!user) {
      throw new Error(`User ${userId} not found`);
    }
    
    return {
      contents: [{
        uri: uri.href,
        text: JSON.stringify(user, null, 2),
        mimeType: "application/json"
      }]
    };
  }
);
```

### Multiple Parameters
```typescript
server.resource(
  "database-record",
  new ResourceTemplate("db://{table}/{id}", {
    list: async () => {
      const resources = [];
      for (const table of ["users", "posts", "comments"]) {
        const records = await queryTable(table);
        resources.push(...records.map(r => ({
          uri: `db://${table}/${r.id}`,
          name: `${table}_${r.id}`,
          description: `${table} record ${r.id}`
        })));
      }
      return { resources };
    },
    complete: {
      table: async (value) => {
        return ["users", "posts", "comments"].filter(t => t.includes(value));
      },
      id: async (value, context) => {
        const table = context?.arguments?.table;
        if (!table) return [];
        const ids = await getTableIds(table);
        return ids.filter(id => id.includes(value));
      }
    }
  }),
  { mimeType: "application/json" },
  async (uri, variables) => {
    const table = variables.table as string;
    const id = variables.id as string;
    
    const record = await fetchRecord(table, id);
    return {
      contents: [{
        uri: uri.href,
        text: JSON.stringify(record, null, 2),
        mimeType: "application/json"
      }]
    };
  }
);
```

## URI Patterns

### Common Schemes
- `config://` - Configuration data
- `docs://` - Documentation
- `status://` - Status and metrics
- `data://` - General data
- `file:///` - File paths
- `logs://` - Log files
- `db://` - Database queries

### Hierarchical URIs
```
config://app/database/connection
config://app/features/auth
docs://api/v1/users
logs://2025-10-25/error
```

## MIME Types

Common MIME types:
- `application/json` - JSON data
- `text/plain` - Plain text
- `text/markdown` - Markdown docs
- `text/html` - HTML content
- `application/xml` - XML data

## Multiple Content Blocks

Return multiple pieces of content:

```typescript
return {
  contents: [
    {
      uri: `${uri.href}/overview`,
      text: "# Overview\n\nThis is the overview...",
      mimeType: "text/markdown"
    },
    {
      uri: `${uri.href}/details`,
      text: JSON.stringify(detailedData, null, 2),
      mimeType: "application/json"
    }
  ]
};
```

## Error Handling

```typescript
async (uri, variables) => {
  try {
    const data = await fetchData(variables.id);
    
    if (!data) {
      throw new Error(`Resource not found: ${variables.id}`);
    }
    
    return {
      contents: [{
        uri: uri.href,
        text: JSON.stringify(data, null, 2),
        mimeType: "application/json"
      }]
    };
  } catch (error) {
    throw new Error(
      `Failed to load resource: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}
```

## Caching Strategies

### Simple Cache
```typescript
const cache = new Map();

async (uri) => {
  if (cache.has(uri.href)) {
    return cache.get(uri.href);
  }
  
  const data = await expensiveOperation();
  const result = {
    contents: [{
      uri: uri.href,
      text: JSON.stringify(data),
      mimeType: "application/json"
    }]
  };
  
  cache.set(uri.href, result);
  return result;
}
```

### TTL Cache
```typescript
const cache = new Map();
const TTL = 60000; // 1 minute

async (uri) => {
  const cached = cache.get(uri.href);
  if (cached && Date.now() - cached.timestamp < TTL) {
    return cached.data;
  }
  
  const data = await fetchData();
  cache.set(uri.href, {
    data: { contents: [...] },
    timestamp: Date.now()
  });
  
  return cache.get(uri.href).data;
}
```

## Best Practices

✅ **Choose Descriptive URIs**: `config://app/database` not `resource://1`
✅ **Set Correct MIME Types**: Helps clients interpret content
✅ **Handle Not Found**: Throw clear errors for missing resources
✅ **Implement List**: Helps clients discover available resources
✅ **Add Autocomplete**: Improves UX with suggestions
✅ **Consider Caching**: For expensive operations
✅ **Validate Parameters**: Check variables before using

❌ **Don't Use Generic URIs**: `resource://{id}` is too vague
❌ **Don't Skip Error Handling**: Always handle failures
❌ **Don't Return Huge Payloads**: Keep under 1MB
❌ **Don't Forget MIME Types**: Always specify

## Example: Complete Dynamic Resource

See example file: `examples/resource-dynamic.ts`

