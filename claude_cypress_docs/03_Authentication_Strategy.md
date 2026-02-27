# Section 3: Authentication Strategy

---

## Overview

The framework implements a **sophisticated multi-layered authentication system** with:
- External user pool management
- Session caching with `cy.session()`
- API-based token authentication
- Multi-organization support
- Automatic user cleanup
- SSO support

---

## Authentication Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                  AUTHENTICATION FLOW DIAGRAM                     │
└─────────────────────────────────────────────────────────────────┘

Test Start
    │
    ├─► cy.fetchBasicUser()
    │        │
    │        └─► cy.task('user:fetch', {pod, type})
    │                 │
    │                 └─► External Users API
    │                       │
    │        ┌──────────────▼──────────────┐
    │        │  POST users-api/fetch       │
    │        │  Authorization: Bearer TOKEN│
    │        └──────────────┬──────────────┘
    │                       │
    │              Returns User Credentials
    │                       │
    │        ┌──────────────▼──────────────┐
    │        │ {                            │
    │        │   username: "auto+basic01"  │
    │        │   password: "Pass123"       │
    │        │   org: "automation"         │
    │        │   pod: "stage"              │
    │        │ }                            │
    │        └──────────────┬──────────────┘
    │                       │
    ├───────────────────────┘
    │
    ├─► DesignerPage.login(user)
    │        │
    │        └─► cy.login(user)
    │                 │
    │                 └─► cy.session([username, usertype], ...)
    │                          │
    │                          ├─► Check Session Cache
    │                          │     ├─► Exists → Restore
    │                          │     └─► Not Exists → Setup
    │                          │
    │            ┌─────────────▼─────────────┐
    │            │  Setup Function           │
    │            │  (Runs Once Per Session)  │
    │            └─────────────┬─────────────┘
    │                          │
    │        ┌─────────────────▼─────────────┐
    │        │ cy.request()                  │
    │        │   POST /api/session           │
    │        │   Authorization: Basic <enc>  │
    │        └─────────────┬─────────────────┘
    │                      │
    │         ┌────────────▼────────────┐
    │         │ Response:               │
    │         │ {                       │
    │         │   token: "eyJhbGc..."  │
    │         │   logging_token: "abc" │
    │         │   username: "auto+..."  │
    │         │ }                       │
    │         └────────────┬────────────┘
    │                      │
    │        ┌─────────────▼─────────────┐
    │        │ Store in localStorage:    │
    │        │ - SLToken                 │
    │        │ - SL_LOGGING_TOKEN        │
    │        │ - SLDBUsername            │
    │        └─────────────┬─────────────┘
    │                      │
    ├──────────────────────┘
    │
    ├─► cy.visit(url)
    │        │
    │        └─► Session Restored Automatically
    │                 │
    │        ┌────────▼────────┐
    │        │ Intercepts:     │
    │        │ @UserProfile    │
    │        │ @asset          │
    │        └────────┬────────┘
    │                 │
    │        Extract Organization Info
    │        Set ENV.orgs.current
    │
Test Execution
    │
    └─► All Requests Use: Authorization: SLToken <token>
    │
After Test
    │
    └─► cy.releaseUsers()
             │
             └─► cy.task('user:release')
                      │
                      └─► POST users-api/release
                               │
                        User Returned to Pool
```

---

## 1. User Pool Management System

### External API

**Configuration** (`.env`):
```bash
USERS_URL="https://elastic.snaplogic.com/api/1/rest/slsched/feed/QA/projects/users"
USERS_TOKEN="ycu94a6Ewr3VefONpq5IaZEywpPO4vSc"
```

### User Fetch Implementation

**File**: `cypress/tasks/users.js`

```javascript
const axios = require('axios')
const querystring = require('querystring')

const headers = {
    'Authorization': `Bearer ${process.env.USERS_TOKEN}`,
    'content-type': 'application/x-www-form-urlencoded'
}

module.exports.fetch = async (payload) => {
    payload.endpoint = 'fetch'
    console.log('Fetching user with payload:', payload)

    try {
        const { data } = await axios.post(
            `${process.env.USERS_URL}/fetch`,
            querystring.stringify(payload),
            { headers }
        )

        console.log('Fetched User:', data.response)
        return data.response
    } catch (err) {
        if (err?.code === 'ECONNREFUSED') {
            console.log('Invalid USERS_URL. Check environment variable.')
        }
        if (err?.response) {
            console.log('User fetch error:', err.response?.data)
        }
        throw err
    }
}
```

### User Release Implementation

```javascript
module.exports.release = async (payload) => {
    payload.endpoint = 'release'
    console.log('Releasing user:', payload.username)

    try {
        const { data } = await axios.post(
            `${process.env.USERS_URL}/release`,
            querystring.stringify(payload),
            { headers }
        )

        console.log('Released User:', data.response)
        return data.response
    } catch (err) {
        console.log('User release error:', err.response?.data)
    }
}

module.exports.releaseAll = async (payload = { pod: env }) => {
    payload.endpoint = 'releaseall'
    console.log('Releasing all users for pod:', payload.pod)

    const res = await post(payload)
    console.log('Released Users:', res)
    return res
}
```

### Custom Commands

**File**: `cypress/support/commands.js`

```javascript
// Fetch user by type
Cypress.Commands.add('fetchBasicUser', () => {
    return cy.task('user:fetch', {
        pod: ENV.name,
        type: 'basic'
    })
})

Cypress.Commands.add('fetchAdminUser', () => {
    return cy.task('user:fetch', {
        pod: ENV.name,
        type: 'admin'
    })
})

Cypress.Commands.add('fetchSysAdminUser', () => {
    return cy.task('user:fetch', {
        pod: ENV.name,
        type: 'sysadmin'
    })
})

// Release users
Cypress.Commands.add('releaseUsers', (users) => {
    users.forEach(user => {
        cy.task('user:release', {
            username: user,
            pod: ENV.name
        })
    })
})
```

### Global User Tracking

**File**: `cypress/support/e2e.js`

```javascript
before(() => {
    // Initialize global Set to track users
    global.testUsers = new Set()
})

after(() => {
    // Release all users after tests complete
    const users = Array.from(global.testUsers)
    if (users?.length > 0) {
        cy.releaseUsers(users)
    }
})
```

### Usage in Tests

```javascript
describe('Test Suite', function() {
    let testUser

    before(function() {
        cy.fetchBasicUser().then(usr => {
            testUser = usr
            // Add to global tracker
            global.testUsers.add(usr.username)

            // Set organization
            usr.org = ENV.orgs.primaryOrg

            // Login
            DesignerPage.login(usr)
        })
    })

    // Tests run with authenticated user
    it('should perform action', function() {
        // User is already logged in
        cy.get('[qa-id="dashboard"]').should('be.visible')
    })
})
```

### Benefits

✅ **No Conflicts**: Each test gets unique user in parallel runs
✅ **No Hardcoded Credentials**: Users managed centrally
✅ **Automatic Cleanup**: Users released after tests
✅ **Scalable**: Pool grows with parallel execution needs
✅ **Auditable**: External API tracks user allocation

---

## 2. cy.session() for Session Caching

### Implementation

**File**: `cypress/support/commands.js`

```javascript
Cypress.Commands.add('login', (payload = {}) => {
    // Set defaults
    if (!payload.url) payload.url = '/'
    if (!payload.setLocalStorage) payload.setLocalStorage = true

    // Determine user type from username convention
    if (!payload.usertypes) {
        if (payload.username.includes('+admin')) {
            payload.usertypes = 'ADMIN'
        } else if (payload.username.includes('+basic')) {
            payload.usertypes = 'BASIC'
        } else if (payload.username.includes('+sysadmin')) {
            payload.usertypes = 'SYS_ADMIN'
        } else {
            payload.usertypes = 'FALLBACK'
        }
    }

    // Cypress logger
    const log = Cypress.log({
        name: 'login',
        displayName: 'LOGIN',
        message: [`🔐 Authenticating | ${payload.username}`],
        autoEnd: false
    })

    log.snapshot('before')

    // Base64 encode credentials
    const encodedStr = Buffer.from(
        `${payload.username}:${payload.password}`
    ).toString('base64')

    try {
        // cy.session with caching
        cy.session(
            [payload.username, payload.usertypes],  // Cache key
            () => {
                // Setup function - runs ONLY on first call
                cy.request({
                    method: 'GET',
                    url: `${Cypress.env('apiBaseUrl')}/1/rest/asset/session?caller=${payload.username}`,
                    headers: {
                        Authorization: `Basic ${encodedStr}`
                    }
                }).then((resp) => {
                    const responseMap = resp.body.response_map

                    if (resp.status === 200) {
                        if (payload.setLocalStorage) {
                            // Store authentication tokens
                            localStorage.setItem('SLToken',
                                responseMap.token)
                            localStorage.setItem('SL_LOGGING_TOKEN',
                                responseMap.logging_token)
                            localStorage.setItem('SLDBUsername',
                                responseMap.username)
                        }

                        // Switch organization if specified
                        if (!ENV.orgs.current && payload.org) {
                            cy.switchOrganization(payload.org)
                        }
                    } else {
                        console.log(`Login failed for: ${payload.username}`)
                        console.log('Error:', responseMap.error_list)
                    }

                    log.set({
                        consoleProps() {
                            return {
                                username: resp.statusCode !== 401 &&
                                    responseMap.username
                            }
                        }
                    })

                    log.snapshot('after')
                    log.end()
                })
            },
            {
                validate() {
                    // Optional: Validate session is still valid
                    // Return true to use cached session
                    // Return false to re-run setup
                }
            }
        )

        // Visit page (session automatically restored)
        cy.visit(payload.url)

        // Setup intercepts
        cy.intercept(`**/api/1/rest/asset/user/${encodeURIComponent(payload.username)}?level=summary`)
            .as('UserProfile')
        cy.intercept('GET', '**/asset/*').as('asset')

        // Extract user profile and org info
        cy.wait('@UserProfile').its('response.body.response_map')
            .then(profile => {
                const organizations = profile.org_snodes.filter(
                    o => o.asset_type === 'Org'
                )

                organizations.forEach((org) => {
                    let data = {
                        snode_id: org.snode_id,
                        parent_snode_id: org.parent_snode_id,
                        owner: org.owner,
                        name: org.name,
                        path: org.path,
                        perms: org.perms,
                        metadata: org.metadata
                    }
                    ENV.orgs.current = data
                })

                cy.wrap(ENV.orgs.current).as('org')
                cy.wrap(ENV.orgs.current.snode_id).as('snodeid')
            })

        cy.get('@asset').its('response.body.response_map')
            .as('assetResponse')

    } catch (error) {
        console.log('Unable to login:', error)
    }
})
```

### Session Caching Benefits

#### Before cy.session() (Every Test)
```
Test 1: Login → 5 seconds
Test 2: Login → 5 seconds
Test 3: Login → 5 seconds
Total: 15 seconds for 3 tests
```

#### After cy.session() (Cache Reuse)
```
Test 1: Login → 5 seconds (cache miss, full login)
Test 2: Login → 0.5 seconds (cache hit, restore localStorage)
Test 3: Login → 0.5 seconds (cache hit, restore localStorage)
Total: 6 seconds for 3 tests (60% faster!)
```

### Session Cache Keys

```javascript
cy.session(
    [payload.username, payload.usertypes],  // Unique cache key
    // ...
)

// Different cache entries:
// ["automation+basic0001@snaplogic.com", "BASIC"]
// ["automation+admin0001@snaplogic.com", "ADMIN"]
// ["automation+basic0001@snaplogic.com", "SYS_ADMIN"]
```

**Why include usertype?**
- Same user might have different permissions in tests
- Ensures correct context for each test
- Prevents permission conflicts

---

## 3. Token-Based Authentication

### Token Storage

After successful login:

```javascript
localStorage.setItem('SLToken', responseMap.token)
localStorage.setItem('SL_LOGGING_TOKEN', responseMap.logging_token)
localStorage.setItem('SLDBUsername', responseMap.username)
```

### Token Format

```javascript
// SLToken example:
"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VybmFtZSI6ImF1dG9tYXRpb25AZXhhbXBsZS5jb20iLCJleHAiOjE3MDk4MjAwMDB9.signature"

// Usage in subsequent requests:
headers: {
    Authorization: `SLToken ${localStorage.getItem('SLToken')}`
}
```

### Automatic Token Injection

Cypress automatically includes localStorage in all same-origin requests:

```javascript
// This request automatically has SLToken
cy.request({
    method: 'GET',
    url: '/api/1/rest/asset/projects',
    // No need to manually add Authorization header!
    // localStorage is preserved
})

// For explicit header:
cy.request({
    method: 'POST',
    url: '/api/1/rest/asset/pipeline',
    headers: {
        Authorization: `SLToken ${localStorage.getItem('SLToken')}`
    },
    body: { /* pipeline config */ }
})
```

### Token Refresh (Not Implemented)

**Current**: Tokens don't expire during test execution
**Enhancement**: Add token refresh logic

```javascript
Cypress.Commands.add('refreshToken', () => {
    const username = localStorage.getItem('SLDBUsername')
    const currentToken = localStorage.getItem('SLToken')

    cy.request({
        method: 'POST',
        url: '/api/1/rest/asset/session/refresh',
        headers: {
            Authorization: `SLToken ${currentToken}`
        }
    }).then(resp => {
        localStorage.setItem('SLToken', resp.body.response_map.token)
    })
})
```

---

## 4. Multi-Organization Support

### Organization Switching

**File**: `cypress/support/commands.js`

```javascript
Cypress.Commands.add('switchOrganization', (organization) => {
    const username = localStorage.getItem('SLDBUsername')

    cy.getUserProfile().then(respMap => {
        const currentOrg = respMap.settings.active_org.toLowerCase()

        if (currentOrg !== organization.toLowerCase()) {
            cy.log(`Switching from ${currentOrg} to ${organization}`)

            cy.request({
                method: 'POST',
                url: `${Cypress.env('apiBaseUrl')}/1/rest/asset/user/${username}`,
                qs: { level: 'summary' },
                body: {
                    settings: { 'active_org': organization },
                    'level': 'summary'
                },
                headers: {
                    Authorization: `SLToken ${localStorage.getItem('SLToken')}`
                }
            }).then((resp) => {
                if (resp.status === 200) {
                    localStorage.setItem('CURRENT_ORG', organization)
                    cy.log('✅ Successfully switched to Org: ' + organization)
                    cy.shortWait()
                } else {
                    cy.log('❌ Failed to switch organization')
                }
            })
        } else {
            cy.log(`Already in org: ${organization}`)
        }
    })
})

// Helper to get user profile
Cypress.Commands.add('getUserProfile', () => {
    const username = localStorage.getItem('SLDBUsername')

    return cy.request({
        method: 'GET',
        url: `${Cypress.env('apiBaseUrl')}/1/rest/asset/user/${username}`,
        qs: { level: 'summary' },
        headers: {
            Authorization: `SLToken ${localStorage.getItem('SLToken')}`
        }
    }).then(resp => resp.body.response_map)
})
```

### Usage in Tests

```javascript
describe('Multi-Org Test', () => {
    before(() => {
        cy.fetchBasicUser().then(usr => {
            usr.org = ENV.orgs.primaryOrg
            DesignerPage.login(usr)
        })
    })

    it('should work in primary org', () => {
        cy.get('[qa-id="org-name"]')
            .should('contain', ENV.orgs.primaryOrg)
    })

    it('should switch to secondary org', () => {
        cy.switchOrganization(ENV.orgs.secondaryOrg)

        cy.reload()

        cy.get('[qa-id="org-name"]')
            .should('contain', ENV.orgs.secondaryOrg)
    })
})
```

### Organization Configuration

**File**: `fixtures/config/stage.properties.json`

```json
{
    "orgs": {
        "primaryOrg": "automation",
        "secondaryOrg": "Automation2",
        "autosyncOrg": "Automation_AutoSync",
        "highEncOrg": "ENC1",
        "highmedEncOrg": "ENC2"
    }
}
```

---

## 5. SSO Support

### Configuration

**File**: `.env`

```bash
SSO_USERNAME="platformqa+sso_new@snaplogicdev.net"
SSO_PASSWORD="Snaplogic@12345"
```

**File**: `cypress.config.js`

```javascript
env: {
    SSO_USERNAME: process.env.SSO_USERNAME,
    SSO_PASSWORD: process.env.SSO_PASSWORD
}
```

### SSO Login Implementation

```javascript
Cypress.Commands.add('loginWithSSO', () => {
    const ssoUsername = Cypress.env('SSO_USERNAME')
    const ssoPassword = Cypress.env('SSO_PASSWORD')

    cy.visit('/login')

    // Click SSO button
    cy.get('[qa-id="sso-login-button"]').click()

    // Redirected to SSO provider (e.g., Okta)
    cy.origin('https://sso.provider.com', () => {
        cy.get('input[name="username"]').type(ssoUsername)
        cy.get('input[name="password"]').type(ssoPassword)
        cy.get('button[type="submit"]').click()
    })

    // Redirected back to app
    cy.url().should('include', '/designer.html')
    cy.get('[qa-id="user-menu"]').should('be.visible')
})
```

---

## 6. Authentication Strategies Comparison

### API Login (Current Approach)

```javascript
✅ Pros:
- Fast (no UI interaction)
- Stable (no element waiting)
- Works with cy.session()
- Parallel-friendly

❌ Cons:
- Doesn't test login UI
- Might miss UI bugs
```

### UI Login

```javascript
Cypress.Commands.add('loginWithUI', (credentials) => {
    cy.visit('/')
    cy.get('input[type="email"]').type(credentials.username)
    cy.get('input[type="password"]').type(credentials.password)
    cy.contains('[qaid="loginButton"]', 'Log In').click()
    cy.url().should('include', '/designer.html')
})

✅ Pros:
- Tests actual login flow
- Catches UI bugs
- More realistic

❌ Cons:
- Slower (UI interactions)
- More flaky (element waits)
- Harder to cache with cy.session()
```

### When to Use Each

| Scenario | Recommended Approach |
|----------|---------------------|
| **Functional tests** | API Login (current) |
| **Login page tests** | UI Login |
| **E2E critical path** | UI Login |
| **Parallel execution** | API Login |
| **Performance testing** | API Login |

---

## 7. User Cleanup Strategy

### Global Cleanup

**File**: `cypress/support/e2e.js`

```javascript
before(() => {
    global.testUsers = new Set()
})

after(() => {
    const users = Array.from(global.testUsers)
    if (users?.length > 0) {
        cy.releaseUsers(users)
    }
})
```

### Per-Test Cleanup

```javascript
describe('Test Suite', () => {
    let testUser

    before(() => {
        cy.fetchBasicUser().then(usr => {
            testUser = usr
            global.testUsers.add(usr.username)
            DesignerPage.login(usr)
        })
    })

    after(() => {
        // Optional: Explicit cleanup per suite
        if (testUser) {
            cy.task('user:release', {
                username: testUser.username,
                pod: ENV.name
            })
            global.testUsers.delete(testUser.username)
        }
    })
})
```

### Release All Users (Manual)

**NPM Script**: `package.json`

```json
{
    "scripts": {
        "users:releaseall": "node -e 'import(\"./cypress/tasks/users.js\").then(loadedModule => loadedModule.releaseAll())'"
    }
}
```

**Usage**:
```bash
npm run users:releaseall
```

---

## Page Break

---
