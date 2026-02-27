# Section 2: Design Patterns

---

## Overview

This framework implements **7 major design patterns** for maintainability, reusability, and scalability.

---

## 1. Page Object Model (POM)

### Architecture

```
┌─────────────────────────────────────────────────────────────┐
│              PAGE OBJECT MODEL HIERARCHY                     │
└─────────────────────────────────────────────────────────────┘

                    ┌───────────────┐
                    │   Page.js     │
                    │  (Base Class) │
                    └───────┬───────┘
                            │
            ┌───────────────┼───────────────┐
            │               │               │
    ┌───────▼───────┐ ┌────▼────┐  ┌──────▼──────┐
    │ DesignerPage  │ │ DashPage│  │ManagerPage  │
    │   (IIP)       │ │(AutoSync│  │   (APIM)    │
    └───────────────┘ └─────────┘  └─────────────┘
```

### Base Page Class Implementation

**File**: `cypress/pageobjects/Page.js`

```javascript
import { getSiteSettings } from '../api/APIMCOMPOSER/requests'

export default class Page {
    // Common login method
    login(obj) {
        obj.url = this.url
        cy.login(obj)
    }

    // Common visit method
    visit() {
        cy.visit(this.url)
    }

    // Organization selection (multi-org support)
    selectOrg(orgName) {
        cy.get('input[placeholder]')
            .invoke('attr', 'placeholder')
            .then((currentOrg) => {
                if (currentOrg?.trim().toLowerCase() ===
                    orgName.trim().toLowerCase()) {
                    cy.log(`Org "${orgName}" is already selected.`)
                    return
                }

                cy.log(`Switching org from "${currentOrg}" to "${orgName}"`)

                cy.getBySel('sl-org-selector-dropdown-dropdownList')
                    .should('be.visible')
                    .click({ force: true })

                cy.get('.org-selector-list-item button')
                    .contains(new RegExp(`^${orgName}$`, 'i'))
                    .should('be.visible')
                    .click({ force: true })

                cy.get('input[placeholder]')
                    .should('have.attr', 'placeholder')
                    .and('match', new RegExp(`^${orgName}$`, 'i'))
            })
    }
}
```

### Child Page Class Example

**File**: `cypress/pageobjects/IIP/Designer/DesignerPage.js`

```javascript
import Page from '../../Page'

class DesignerPage extends Page {
    constructor() {
        super()
        this.name = 'Designer'
        this.url = `${SL}/designer.html`  // Dynamic URL

        // Locators as properties
        this.designerTabCss = '#slc-header-tab-Designer'
        this.iipWaffleIconCss = 'div.slc-icon-32.slc-icon-waffle-menu'
        this.pipelineName = 'div.sl-pipeline-tabs > div.sl-tab-body'
        this.executePipelineBtn = '#sl-menu-ctrl-run'
        this.canvas = '#sl-wb'
    }

    // Getters for lazy element resolution
    get designerTab() {
        return cy.get(this.designerTabCss)
    }

    get iipWaffleIcon() {
        return cy.get(this.iipWaffleIconCss)
    }

    get canvas() {
        return cy.get(this.canvas)
    }

    // Action methods
    verifyDesignerTabIsActive() {
        this.designerTab.should('have.class', 'slc-header-title-active')
    }

    clickIIPWaffleIcon() {
        this.iipWaffleIcon.click()
        return this  // Method chaining
    }

    clickMonitor() {
        this.monitor.click()
        return this
    }
}

// Singleton pattern - export instance
export default new DesignerPage()
```

### POM Usage in Tests

```javascript
// File: cypress/tests/ui/IIP/Designer/HomePage.spec.js
import DesignerPage from '../../../../pageobjects/IIP/Designer/DesignerPage'

describe('Homepage', function() {
    before(function() {
        cy.fetchBasicUser().then(usr => {
            usr.org = ENV.orgs.primaryOrg
            DesignerPage.login(usr)  // Using POM login
        })
    })

    after(function() {
        cy.logout()
    })

    context('When correct credentials are entered', function() {
        it('TC12003168 User should be logged in',
           { tags: 'TC12003168' },
           function() {
            cy.get('#slc-header-logo').should('exist').and('be.visible')
        })
    })
})
```

### POM Best Practices in This Framework

✅ **Inheritance**: Base `Page` class with common methods
✅ **Singleton**: Each page exported as instance
✅ **Getters**: ES6 getters for lazy element resolution
✅ **Method Chaining**: Return `this` for fluent API
✅ **Team Organization**: Folders by product team
✅ **Dynamic URLs**: Use global `SL` variable for feature branch support

---

## 2. Custom Commands Pattern

### Purpose
Encapsulate reusable actions to avoid code duplication and improve test readability.

### Command Categories

**File**: `cypress/support/commands.js` (2631 lines!)

#### A. Selector Commands

```javascript
// Custom data-qa-id selector
Cypress.Commands.add('getBySel', (selector, ...args) => {
    return cy.get(`[qa-id="${selector}"]`, ...args)
})

// Partial match selector
Cypress.Commands.add('getBySelLike', (selector, ...args) => {
    return cy.get(`[qa-id*="${selector}"]`, ...args)
})

// Usage in test:
cy.getBySel('submit-button').click()
cy.getBySelLike('user-').should('have.length', 5)
```

#### B. Wait Utilities

```javascript
// Smart loading wait
Cypress.Commands.add('waitUntilDoneLoading', (timeout = 5000) => {
    const selector = '.sl-busy-mask, .mask, .busy, [alt="loading-svg"]'
    if (Cypress.$(selector).length) {
        cy.get(selector, {timeout}).should('not.exist')
    }
})

// Predefined waits
Cypress.Commands.add('shortWait', () => {
    cy.wait(250)
})

Cypress.Commands.add('longWait', () => {
    cy.wait(5000)
})

// Pipeline-specific wait
Cypress.Commands.add('waitTillRunCompletes', (timeout = 60000) => {
    cy.getBySel('autosync-details-stop-run-stop-icon', {timeout})
        .should('not.exist')
})
```

#### C. Authentication Commands

```javascript
// Main login command with session caching
Cypress.Commands.add('login', (payload = {}) => {
    cy.wrap(payload.username).as('currentUser')

    // Intercepts for profile data
    cy.intercept(`**/api/1/rest/asset/user/${encodeURIComponent(payload.username)}`)
        .as('UserProfile')

    if (!payload.url) payload.url = '/'
    if (!payload.setLocalStorage) payload.setLocalStorage = true

    // Determine user type from username
    if (!payload.usertypes) {
        if (payload.username.includes('+admin')) {
            payload.usertypes = 'ADMIN'
        } else if (payload.username.includes('+basic')) {
            payload.usertypes = 'BASIC'
        } else if (payload.username.includes('+sysadmin')) {
            payload.usertypes = 'SYS_ADMIN'
        }
    }

    const encodedStr = Buffer.from(`${payload.username}:${payload.password}`)
        .toString('base64')

    cy.session(
        [payload.username, payload.usertypes],  // Cache key
        () => {
            cy.request({
                method: 'GET',
                url: `${Cypress.env('apiBaseUrl')}/1/rest/asset/session`,
                headers: { Authorization: `Basic ${encodedStr}` }
            }).then((resp) => {
                const responseMap = resp.body.response_map
                if (resp.status === 200) {
                    if (payload.setLocalStorage) {
                        localStorage.setItem('SLToken', responseMap.token)
                        localStorage.setItem('SL_LOGGING_TOKEN',
                            responseMap.logging_token)
                        localStorage.setItem('SLDBUsername',
                            responseMap.username)
                    }
                }
            })
        },
        {
            validate() {
                // Session validation logic
            }
        }
    )

    cy.visit(payload.url)
    cy.wait('@UserProfile').its('response.body.response_map')
        .then(profile => {
            // Extract and store org info in global.ENV
            const organizations = profile.org_snodes.filter(
                o => o.asset_type === 'Org'
            )
            ENV.orgs.current = organizations[0]
        })
})

// API-only login (no UI visit)
Cypress.Commands.add('apiLogin', (credentials, signInPath='nonav') => {
    return cy.login(credentials, signInPath, false)
})

// UI-based login (for testing login page)
Cypress.Commands.add('loginWithUI', (credentials) => {
    cy.visit('/')
    cy.get('input[type="email"]').type(credentials.username)
    cy.get('input[type="password"]').type(credentials.password)
    cy.contains('[qaid="loginButton"]', 'Log In').click()
    cy.url().should('include', '/designer.html')
})
```

#### D. Organization Management

```javascript
Cypress.Commands.add('switchOrganization', (organization) => {
    const username = localStorage.getItem('SLDBUsername')

    cy.getUserProfile().then(respMap => {
        if (respMap.settings.active_org.toLowerCase() !== organization) {
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
                    cy.log('Successfully switched to Org: ' + organization)
                    cy.shortWait()
                }
            })
        }
    })
})
```

#### E. User Management Commands

```javascript
// Fetch user from pool
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

// Release users back to pool
Cypress.Commands.add('releaseUsers', (users) => {
    users.forEach(user => {
        cy.task('user:release', {
            username: user,
            pod: ENV.name
        })
    })
})
```

#### F. Utility Commands

```javascript
// Generate time rounded to nearest 15 minutes
Cypress.Commands.add('generateTime', () => {
    const currentTime = new Date()
    const timeIncrement = 15
    const roundedMinutes = Math.ceil(
        currentTime.getMinutes() / timeIncrement
    ) * timeIncrement
    currentTime.setMinutes(roundedMinutes)
    return Cypress.moment(currentTime).format('h:mm A')
})

// Reload and find element (retry pattern)
Cypress.Commands.add('reloadAndFindElement', (selector) => {
    const ifElementExists = (attempt = 0) => {
        if (attempt === 10) return null
        const len = Cypress.$(selector).length
        cy.log(`Element ${selector} Found: `, len)
        if (len === 0) {
            return cy.wait(5000)
                .then(() => {
                    cy.reload()
                    cy.waitUntilDoneLoading()
                    return ifElementExists(++attempt)
                })
        }
        return cy.get(selector)
    }
    ifElementExists()
})
```

### Team-Specific Commands

Commands are modularized by team:

**File**: `cypress/support/commands/Studio.js`
```javascript
// Studio-specific commands
Cypress.Commands.add('createPipeline', (pipelineName) => {
    // Studio pipeline creation logic
})

Cypress.Commands.add('executePipeline', (pipelineName) => {
    // Studio pipeline execution logic
})
```

**File**: `cypress/support/commands/apim.js`
```javascript
// APIM-specific commands
Cypress.Commands.add('createAPI', (apiConfig) => {
    // APIM API creation logic
})

Cypress.Commands.add('publishAPI', (apiName, version) => {
    // APIM publish logic
})
```

All commands imported in `commands.js`:
```javascript
import './commands/apim'
import './commands/AutoSync'
import './commands/Studio'
import './commands/versioning'
```

---

## 3. Fixtures Pattern (Test Data Management)

### Structure

```
fixtures/
├── config/                      # Environment configurations
│   ├── stage.properties.json
│   ├── canary.properties.json
│   ├── uat.properties.json
│   ├── prod.properties.json
│   └── local.properties.json
│
├── APIM/                        # APIM test data
│   ├── api-definitions.json
│   └── policies.json
│
├── Studio/                      # Studio test data
│   ├── pipeline-configs.json
│   └── snap-configs.json
│
├── AutoSync/                    # AutoSync test data
│
├── common/                      # Shared test data
│   └── setupdata.js
│
└── JsonFiles/                   # Generic JSON payloads
```

### Environment Configuration Example

**File**: `fixtures/config/stage.properties.json`

```json
{
    "name": "stage",
    "baseUrl": "https://cdn.stage.elastic.snaplogicdev.com",
    "plexes": {
        "cloudplex": "Cloud",
        "groundplex": "DEV Groundplex",
        "feedmaster": "feedmaster",
        "apim": "APIMplex",
        "autoSyncPlex": "AutoSyncPlex"
    },
    "orgs": {
        "primaryOrg": "automation",
        "secondaryOrg": "Automation2",
        "autosyncOrg": "Automation_AutoSync",
        "highEncOrg": "ENC1"
    }
}
```

### Dynamic Configuration Loading

**File**: `cypress/support/e2e.js`

```javascript
import { getConfigurationByFile } from './utils'

const env = Cypress.env('environment')

if (!env) {
    throw new Error('Environment not configured in .env file')
}

// Load environment-specific configuration
getConfigurationByFile(env).then(e => {
    if (!e) {
        throw new Error(`Config not found for: ${env}`)
    }
    global.ENV = e  // Available globally in all tests
})

// Override for local environment
if (env === 'local') {
    try {
        const localConfig = require('../fixtures/config/local.properties.json')
        if (localConfig && localConfig.orgs) {
            global.ENV.orgs = {
                ...global.ENV.orgs,
                ...localConfig.orgs
            }
        }
    } catch (error) {
        console.log('Could not override with local config:', error.message)
    }
}
```

### Usage in Tests

```javascript
describe('Test Suite', () => {
    it('should use environment config', () => {
        // Access global ENV object
        const org = ENV.orgs.primaryOrg        // "automation"
        const plex = ENV.plexes.cloudplex      // "Cloud"
        const baseUrl = ENV.baseUrl            // "https://..."

        cy.switchOrganization(org)
        cy.selectSnaplex(plex)
    })
})
```

### Fixture Loading in Tests

```javascript
describe('API Tests', () => {
    let apiConfig

    before(() => {
        // Load fixture
        cy.fixture('APIM/api-definitions.json').then(data => {
            apiConfig = data
        })

        // Or use alias
        cy.fixture('Studio/pipeline-configs.json').as('pipelineConfig')
    })

    it('should create API', function() {
        // Use fixture data
        cy.createAPI(apiConfig.basicAPI)

        // Or use alias
        cy.createPipeline(this.pipelineConfig.dataPipeline)
    })
})
```

---

## 4. Node Tasks Pattern

### Purpose
Execute Node.js code from Cypress tests for operations that need to run outside the browser context.

### Task Registration

**File**: `cypress.config.js`

```javascript
setupNodeEvents(cypressOn, config) {
    const on = require('cypress-on-fix')(cypressOn)

    on('task', {
        // User management
        async 'user:fetch'(payload) {
            const result = await users.fetch(payload)
            return result ?? null
        },

        async 'user:release'(payload) {
            return users.release(payload)
        },

        async 'user:releaseAll'(payload) {
            return users.releaseAll(payload)
        },

        // Email verification
        async 'email:get'(options) {
            let imap, emails
            try {
                imap = new Imap()
                await imap.connect()
                await imap.openBox()
                emails = await imap.checkInbox(options)
            } catch (error) {
                console.log('IMAP Error:', error)
            } finally {
                await imap.end()
            }
            return emails
        },

        // APIM operations
        async 'unpublish:unpublishApiAsync'(payload) {
            return apim.unpublishApiAsync(payload)
        },

        async 'delete:deleteApiAsync'(payload) {
            return apim.deleteApiAsync(payload)
        },

        // Image manipulation
        async 'runTask:generateUniqueImage'(baseImageName) {
            return generateUniqueImage(baseImageName)
        },

        // File operations
        async 'getLatestDownloadedFile'() {
            const downloadsFolder = path.join(__dirname, 'cypress', 'downloads')
            const files = fs.readdirSync(downloadsFolder)
                .map(name => ({
                    name,
                    time: fs.statSync(path.join(downloadsFolder, name))
                        .mtime.getTime()
                }))
                .sort((a, b) => b.time - a.time)
            return files.length ? files[0].name : null
        }
    })

    return config
}
```

### User Management Task

**File**: `cypress/tasks/users.js`

```javascript
const axios = require('axios')
const querystring = require('querystring')
const { env } = require('../utils/environment')

const headers = {
    'Authorization': `Bearer ${process.env.USERS_TOKEN}`,
    'content-type': 'application/x-www-form-urlencoded'
}

module.exports.fetch = async (payload) => {
    payload.endpoint = 'fetch'
    const res = await post(payload)
    console.log('Fetched User:', res)
    return res
}

module.exports.release = async (payload) => {
    payload.endpoint = 'release'
    const res = await post(payload)
    console.log('Released User:', res)
    return res
}

module.exports.releaseAll = async (payload = { pod: env }) => {
    payload.endpoint = 'releaseall'
    const res = await post(payload)
    console.log('Released Users:', res)
    return res
}

const post = async (payload) => {
    console.log(`Posting ${payload.endpoint}:`, payload)
    try {
        const { data } = await axios.post(
            `${process.env.USERS_URL}/${payload.endpoint}`,
            querystring.stringify(payload),
            { headers }
        )
        return data.response
    } catch (err) {
        console.log(`user:${payload.endpoint} error:`, err.response?.data)
    }
}
```

### Usage in Tests

```javascript
describe('Test with Tasks', () => {
    let testUser

    before(() => {
        // Fetch user from pool
        cy.task('user:fetch', {
            pod: 'stage',
            type: 'basic'
        }).then(user => {
            testUser = user
        })
    })

    after(() => {
        // Release user back to pool
        cy.task('user:release', {
            username: testUser.username,
            pod: 'stage'
        })
    })

    it('should verify email', () => {
        // Trigger email in app
        cy.get('[qa-id="send-email-button"]').click()

        // Check email via IMAP task
        cy.task('email:get', {
            subject: 'Test Email',
            from: 'noreply@snaplogic.com',
            since: new Date()
        }).then(emails => {
            expect(emails).to.have.length(1)
            expect(emails[0].body).to.include('Verification Code')
        })
    })

    it('should generate unique image', () => {
        cy.task('runTask:generateUniqueImage', 'base-image.png')
            .then(uniqueImageName => {
                cy.get('input[type="file"]').attachFile(uniqueImageName)
            })
    })
})
```

---

## Page Break

---
