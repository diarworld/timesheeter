---
name: ai-factory.architecture
description: Software architecture patterns and guidelines. Covers Clean Architecture, DDD, microservices, monoliths, and how to choose the right approach. Use when designing systems, refactoring, asking "how should I structure", "which architecture", "monolith vs microservices".
argument-hint: [clean|ddd|microservices|monolith|layers]
allowed-tools: Read Glob Grep
---

# Architecture Patterns Guide

Practical guidelines for software architecture decisions.

## Quick Reference

- `/ai-factory.architecture` — Overview and decision guide
- `/ai-factory.architecture clean` — Clean Architecture
- `/ai-factory.architecture ddd` — Domain-Driven Design
- `/ai-factory.architecture microservices` — Microservices patterns
- `/ai-factory.architecture monolith` — Modular monolith
- `/ai-factory.architecture layers` — Layered architecture

---

## Choosing an Architecture

### Decision Matrix

| Factor | Monolith | Modular Monolith | Microservices |
|--------|----------|------------------|---------------|
| Team size | 1-10 | 5-30 | 20+ |
| Domain complexity | Low-Medium | Medium-High | High |
| Scale requirements | Moderate | Moderate-High | Very High |
| Deploy independence | ❌ | Partial | ✅ |
| Initial velocity | ✅ Fast | ✅ Fast | ❌ Slow |
| Operational complexity | ✅ Low | ✅ Low | ❌ High |

### Start Here
```
New project? → Start with Modular Monolith
  ↓
Growing team + clear domain boundaries? → Extract to Microservices
  ↓
Single team + unclear boundaries? → Stay Monolith, refine modules
```

---

## Clean Architecture

### Core Principle
Dependencies point inward. Inner layers know nothing about outer layers.

```
┌─────────────────────────────────────────────────────────┐
│                    Frameworks & Drivers                  │
│  ┌─────────────────────────────────────────────────┐    │
│  │              Interface Adapters                  │    │
│  │  ┌─────────────────────────────────────────┐    │    │
│  │  │           Application Layer              │    │    │
│  │  │  ┌─────────────────────────────────┐    │    │    │
│  │  │  │         Domain Layer            │    │    │    │
│  │  │  │    (Entities & Business Rules)  │    │    │    │
│  │  │  └─────────────────────────────────┘    │    │    │
│  │  └─────────────────────────────────────────┘    │    │
│  └─────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────┘
```

### Folder Structure
```
src/
├── domain/                 # Core business logic (no dependencies)
│   ├── entities/
│   │   └── User.ts
│   ├── value-objects/
│   │   └── Email.ts
│   └── repositories/       # Interfaces only
│       └── IUserRepository.ts
│
├── application/            # Use cases (depends on domain)
│   ├── use-cases/
│   │   ├── CreateUser.ts
│   │   └── GetUserById.ts
│   └── services/
│       └── AuthService.ts
│
├── infrastructure/         # External concerns (implements interfaces)
│   ├── database/
│   │   └── PrismaUserRepository.ts
│   ├── external/
│   │   └── StripePaymentGateway.ts
│   └── config/
│
└── presentation/           # UI/API layer
    ├── api/
    │   └── routes/
    ├── controllers/
    └── dto/
```

### Dependency Rule Example
```typescript
// ✅ domain/repositories/IUserRepository.ts (interface)
interface IUserRepository {
  findById(id: string): Promise<User | null>;
  save(user: User): Promise<void>;
}

// ✅ infrastructure/database/PrismaUserRepository.ts (implementation)
class PrismaUserRepository implements IUserRepository {
  constructor(private prisma: PrismaClient) {}

  async findById(id: string): Promise<User | null> {
    const data = await this.prisma.user.findUnique({ where: { id } });
    return data ? User.fromPersistence(data) : null;
  }
}

// ✅ application/use-cases/GetUserById.ts (depends on interface)
class GetUserById {
  constructor(private userRepo: IUserRepository) {}

  async execute(id: string): Promise<User> {
    const user = await this.userRepo.findById(id);
    if (!user) throw new UserNotFoundError(id);
    return user;
  }
}
```

---

## Domain-Driven Design (DDD)

### Strategic Patterns

**Bounded Contexts**: Explicit boundaries around domain models
```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│    Ordering     │     │    Inventory    │     │    Shipping     │
│    Context      │────▶│    Context      │────▶│    Context      │
│                 │     │                 │     │                 │
│  Order          │     │  Product        │     │  Shipment       │
│  OrderLine      │     │  Stock          │     │  Carrier        │
│  Customer       │     │  Warehouse      │     │  TrackingInfo   │
└─────────────────┘     └─────────────────┘     └─────────────────┘
```

**Context Mapping**: How contexts communicate
- Shared Kernel: Common code between contexts
- Customer/Supplier: Upstream/downstream relationship
- Anti-Corruption Layer: Translation between contexts

### Tactical Patterns

**Entities**: Identity-based objects
```typescript
class Order {
  constructor(
    public readonly id: OrderId,
    private items: OrderItem[],
    private status: OrderStatus
  ) {}

  addItem(product: Product, quantity: number): void {
    if (this.status !== 'draft') {
      throw new Error('Cannot modify confirmed order');
    }
    this.items.push(new OrderItem(product, quantity));
  }
}
```

**Value Objects**: Immutable, equality by value
```typescript
class Money {
  constructor(
    public readonly amount: number,
    public readonly currency: string
  ) {
    if (amount < 0) throw new Error('Amount cannot be negative');
  }

  add(other: Money): Money {
    if (this.currency !== other.currency) {
      throw new Error('Currency mismatch');
    }
    return new Money(this.amount + other.amount, this.currency);
  }

  equals(other: Money): boolean {
    return this.amount === other.amount && this.currency === other.currency;
  }
}
```

**Aggregates**: Consistency boundaries
```typescript
// Order is the Aggregate Root
// OrderItems can only be modified through Order
class Order {
  private items: OrderItem[] = [];

  // All invariants enforced here
  addItem(item: OrderItem): void {
    if (this.items.length >= 100) {
      throw new Error('Order cannot have more than 100 items');
    }
    this.items.push(item);
  }
}
```

**Domain Events**: Communicate state changes
```typescript
class OrderPlaced implements DomainEvent {
  constructor(
    public readonly orderId: string,
    public readonly customerId: string,
    public readonly occurredAt: Date = new Date()
  ) {}
}

// Usage
order.place();
eventBus.publish(new OrderPlaced(order.id, order.customerId));
```

---

## Microservices Patterns

### When to Use
- ✅ Large teams needing independent deployment
- ✅ Different scaling requirements per service
- ✅ Polyglot persistence needs
- ❌ Small team (< 10 people)
- ❌ Unclear domain boundaries
- ❌ Startups exploring product-market fit

### Service Boundaries
```
✅ Good boundaries:
  - User Service (authentication, profiles)
  - Order Service (order lifecycle)
  - Payment Service (transactions, refunds)
  - Notification Service (email, SMS, push)

❌ Bad boundaries:
  - Database Service (too technical)
  - Validation Service (too generic)
  - Utils Service (not a domain)
```

### Communication Patterns

**Synchronous (HTTP/gRPC)**
```
Order Service ──HTTP──▶ Inventory Service
                       "Check stock for product X"
```
Use for: Queries, real-time validation

**Asynchronous (Events/Messages)**
```
Order Service ──Event──▶ Message Broker ──▶ Notification Service
                         "OrderPlaced"      (sends email)
```
Use for: Side effects, eventual consistency

### Data Patterns

**Database per Service**
```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Orders    │     │  Inventory  │     │  Payments   │
│   Service   │     │   Service   │     │   Service   │
└──────┬──────┘     └──────┬──────┘     └──────┬──────┘
       │                   │                   │
   ┌───▼───┐           ┌───▼───┐           ┌───▼───┐
   │ PostgreSQL       │ MongoDB │           │ PostgreSQL
   └───────┘           └───────┘           └───────┘
```

**Saga Pattern** for distributed transactions
```
Order Saga:
  1. Create Order (Orders Service)
  2. Reserve Inventory (Inventory Service)
  3. Process Payment (Payment Service)
  4. Confirm Order (Orders Service)

  If step fails → Compensate previous steps
```

---

## Modular Monolith

### Best of Both Worlds
- Single deployment unit (simple ops)
- Strong module boundaries (future extraction ready)
- Shared database with logical separation

### Structure
```
src/
├── modules/
│   ├── users/
│   │   ├── api/           # HTTP handlers
│   │   ├── domain/        # Business logic
│   │   ├── infra/         # Database, external
│   │   └── index.ts       # Public API only
│   │
│   ├── orders/
│   │   ├── api/
│   │   ├── domain/
│   │   ├── infra/
│   │   └── index.ts
│   │
│   └── payments/
│       └── ...
│
├── shared/                 # Truly shared code
│   ├── kernel/            # Base classes, interfaces
│   └── utils/             # Pure utilities
│
└── main.ts                # Composition root
```

### Module Communication Rules
```typescript
// ✅ Good: Module exposes explicit public API
// modules/users/index.ts
export { UserService } from './domain/UserService';
export { User } from './domain/User';
export type { CreateUserDTO } from './api/dto';

// ✅ Good: Other modules use public API
import { UserService } from '@/modules/users';

// ❌ Bad: Reaching into module internals
import { UserRepository } from '@/modules/users/infra/UserRepository';
```

---

## Quick Decision Guide

```
Q: New greenfield project?
A: Start with Modular Monolith

Q: Existing messy codebase?
A: Apply Clean Architecture gradually

Q: Team > 50 engineers?
A: Consider Microservices with clear domain boundaries

Q: Need to scale one component independently?
A: Extract that component as a service

Q: Unclear requirements?
A: Keep it simple, refactor when patterns emerge
```
