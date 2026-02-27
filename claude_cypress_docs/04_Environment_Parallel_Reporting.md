# Section 4-7: Environment, Test Data, Parallel Execution & Reporting

---

## 4. ENVIRONMENT CONFIGURATION STRATEGY

### Multi-Tier Environment Management

```
┌─────────────────────────────────────────────────────────────┐
│         ENVIRONMENT CONFIGURATION FLOW                      │
└─────────────────────────────────────────────────────────────┘

                    .env file
                        │
           ┌────────────┼────────────┐
           │            │            │
      ENVIRONMENT    BROWSER      TEAM
      (Full URL)    (chrome)   (STUDIO)
           │            │            │
           └────────────┼────────────┘
                        │
              dotenv.config()
                        │
           ┌────────────▼────────────┐
           │  utils/environment.js   │
           │  deriveEnvAndBaseUrl()  │
           └────────────┬────────────┘
                        │
              Parse URL → env name
            (stage, canary, uat, etc.)
                        │
           ┌────────────▼────────────┐
           │  cypress.config.js      │
           │  env: { environment }   │
           └────────────┬────────────┘
                        │
            Cypress.env('environment')
                        │
           ┌────────────▼────────────┐
           │  support/e2e.js         │
           │ getConfigurationByFile()│
           └────────────┬────────────┘
                        │
      Load fixtures/config/{env}.properties.json
                        │
           ┌────────────▼────────────┐
           │  global.ENV = {...}     │
           │  Available in all tests │
           └─────────────────────────┘
```

### Environment Derivation Logic

**File**: `cypress/utils/environment.js`

```javascript
require('dotenv').config()

function deriveEnvAndBaseUrl(raw) {
    if (!raw) {
        throw new Error('ENVIRONMENT must be a full URL')
    }

    let rawUrl
    try {
        rawUrl = new URL(raw)
    } catch {
        throw new Error(`Invalid ENVIRONMENT URL: ${raw}`)
    }

    // Allow non-https only if port is explicitly provided (local/dev)
    const hasPort = !!rawUrl.port
    if (rawUrl.protocol !== 'https:' && !hasPort) {
        throw new Error('URL must be https (non-https only with port)')
    }

    const host = rawUrl.hostname.toLowerCase()
    const baseUrl = `${rawUrl.protocol}//${rawUrl.host}`

    // Known hosts mapping
    const knownHosts = {
        // PROD pods
        'cdn.elastic.snaplogic.com': 'elastic',
        'cdn.emea.snaplogic.com': 'emea',
        // UAT pods
        'cdn.uat.elastic.snaplogic.com': 'us.uat',
        'cdn.uat.emea.snaplogic.com': 'emea.uat',
        // Local
        'localhost': 'local'
    }

    if (knownHosts[host]) {
        return { env: knownHosts[host], baseUrl }
    }

    // Non-prod mapping: cdn.stage.elastic.snaplogicdev.com → "stage"
    const nonProdPrefix = host.match(/^(.*?)(?=elastic)/)?.[0]?.replace(/\.$/, '')
    if (nonProdPrefix) {
        const envFromNonProd = nonProdPrefix.split('.').filter(Boolean).pop()
        if (envFromNonProd) return { env: envFromNonProd, baseUrl }
    }

    // Ephemeral URLs
    const isEphemeral = /\.ephemeral\..*\.snaplogic\.net$/i.test(host)
    if (isEphemeral) return { env: 'unified', baseUrl }

    // Fallback: use first subdomain
    return { env: host.split('.')[0], baseUrl }
}

// Parse environment from .env
const envUrl = process.env.ENVIRONMENT?.toLowerCase()
const { env, baseUrl } = deriveEnvAndBaseUrl(envUrl)

module.exports = { deriveEnvAndBaseUrl, env, baseUrl, envUrl }
```

### .env Configuration

```bash
# Team Selection
TEAM="STUDIO"  # AUTOSYNC, IIP, APIM, STUDIO

# Environment URL (FULL URL REQUIRED)
ENVIRONMENT='https://cdn.stage.elastic.snaplogicdev.com/'

# Commented alternatives:
#ENVIRONMENT='https://cdn.canary.elastic.snaplogicdev.com'
#ENVIRONMENT='https://cdn.hawk.elastic.snaplogicdev.com'
#ENVIRONMENT='https://cdn.uat.elastic.snaplogic.com'
#ENVIRONMENT='https://cdn.elastic.snaplogic.com'  # PROD
#ENVIRONMENT='http://localhost:8888'              # Local

# Browser Configuration
BROWSER='chrome'  # chrome, firefox, microsoftedge

# Parallel Execution
MAX_INSTANCES="10"

# Retry Configuration
RETRIES="0"

# Feature Branch (optional)
FEATUREBRANCH=""

# TestRail Integration
TESTRAIL_HOST="https://mysnaplogic.testrail.com"
TESTRAIL_USERNAME="automation@snaplogic.com"
TESTRAIL_PASSWORD="<REDACTED>"
TESTRAIL_ENABLED="1"

# User Management
USERS_URL="https://elastic.snaplogic.com/api/1/rest/slsched/feed/QA/projects/users"
USERS_TOKEN="<REDACTED>"

# SSO Credentials
SSO_USERNAME="platformqa+sso_new@snaplogicdev.net"
SSO_PASSWORD="<REDACTED>"

# Email Verification (IMAP)
EMAIL_USER=""
EMAIL_PASSWORD=""
```

### Environment-Specific Configuration Files

**File**: `fixtures/config/stage.properties.json`

```json
{
    "name": "stage",
    "baseUrl": "https://cdn.stage.elastic.snaplogicdev.com",
    "plexes": {
        "cloudplex": "Cloud",
        "groundplex": "DEV Groundplex",
        "feedmaster": "feedmaster",
        "Hadooplex": "Tim Hadooplex",
        "pipeLineQueing": "Pipeline Queueing",
        "apim": "APIMplex",
        "jccAlertPlex": "JccAlertSnaplex",
        "autoSyncPlex": "AutoSyncPlex",
        "ultraPlex": "GroundFeedmaster"
    },
    "orgs": {
        "primaryOrg": "automation",
        "secondaryOrg": "Automation2",
        "autosyncOrg": "Automation_AutoSync",
        "highEncOrg": "ENC1",
        "highmedEncOrg": "ENC2",
        "highmedlowEncOrg": "ENC3",
        "dpAutomationOrg": "DpAutomation"
    }
}
```

### Global ENV Object Loading

**File**: `cypress/support/e2e.js`

```javascript
import { getConfigurationByFile } from './utils'

const env = Cypress.env('environment')

if (!env) {
    throw new Error('Environment not configured. Set ENVIRONMENT in .env')
}

getConfigurationByFile(env).then(e => {
    if (!e) {
        throw new Error(`Config not found for: ${env}. ` +
            `Check if cypress/fixtures/config/${env}.properties.json exists.`)
    }
    global.ENV = e

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
}).catch(err => {
    console.log('Error setting environment:', err)
})
```

### Feature Branch Support

```javascript
// support/e2e.js
const featureBranch = Cypress.env('featureBranch')
console.log('FeatureBranch:', featureBranch)

// Generate dynamic URL prefix
// /sl → /sl/my-feature-branch
global.SL = featureBranch ? `/sl/${featureBranch}` : '/sl'

// Usage in Page Objects:
// this.url = `${SL}/designer.html`
// Becomes: /sl/my-feature-branch/designer.html
```

---

## 5. TEST DATA HANDLING STRATEGY

### Multi-Source Test Data Architecture

```
Test Data Sources
    │
    ├── 1. Fixtures (Static Data)
    │      ├── fixtures/config/*.properties.json
    │      ├── fixtures/APIM/*.json
    │      └── fixtures/Studio/*.json
    │
    ├── 2. User Pool (Dynamic Users)
    │      └── External API → cy.task('user:fetch')
    │
    ├── 3. Runtime Generation
    │      ├── @faker-js/faker
    │      ├── cy.generateTime()
    │      └── uuidv4()
    │
    ├── 4. API Pre-conditions
    │      ├── cy.api() requests
    │      └── cy.task('runTask:*')
    │
    └── 5. Environment Variables
           └── Cypress.env('*')
```

### 1. Fixture Loading

```javascript
describe('Test with Fixtures', () => {
    let apiConfig

    before(() => {
        // Load fixture
        cy.fixture('APIM/api-definitions.json').then(data => {
            apiConfig = data
        })

        // Or use alias
        cy.fixture('Studio/pipeline-configs.json').as('pipelineConfig')
    })

    it('should use fixture data', function() {
        cy.createAPI(apiConfig.basicAPI)
        cy.createPipeline(this.pipelineConfig.dataPipeline)
    })
})
```

### 2. Faker.js Integration

**Installation**: `"@faker-js/faker": "^7.3.0"`

```javascript
import { faker } from '@faker-js/faker'

describe('Test with Fake Data', () => {
    it('should generate dynamic data', () => {
        const pipelineName = `Pipeline_${faker.datatype.uuid()}`
        const email = faker.internet.email()
        const companyName = faker.company.name()
        const apiVersion = faker.system.semver()

        cy.createPipeline({
            name: pipelineName,
            owner: email,
            description: `Created by ${companyName}`
        })
    })
})
```

### 3. Custom Data Generators

**File**: `cypress/support/commands.js`

```javascript
// Generate time rounded to 15-minute intervals
Cypress.Commands.add('generateTime', () => {
    const currentTime = new Date()
    const timeIncrement = 15
    const roundedMinutes = Math.ceil(
        currentTime.getMinutes() / timeIncrement
    ) * timeIncrement
    currentTime.setMinutes(roundedMinutes)
    return Cypress.moment(currentTime).format('h:mm A')
})

// Usage:
it('should schedule task', () => {
    const scheduleTime = cy.generateTime()  // "2:45 PM"
    cy.get('[qa-id="schedule-time"]').type(scheduleTime)
})
```

### 4. Unique Image Generation

**File**: `cypress.config.js`

```javascript
async function generateUniqueImage(baseImageName) {
    const baseDir = path.resolve('cypress/fixtures')
    const baseImagePath = path.join(baseDir, baseImageName)

    if (!fs.existsSync(baseImagePath)) {
        throw new Error(`Image "${baseImageName}" not found`)
    }

    const ext = path.extname(baseImageName)
    const timestamp = Date.now()
    const uniqueImageName = `temp-${timestamp}${ext}`
    const uniqueImagePath = path.join(baseDir, uniqueImageName)

    // Add SVG overlay with timestamp
    const svgOverlay = Buffer.from(`
        <svg width="400" height="100">
            <text x="0" y="30" font-size="28" fill="white">${timestamp}</text>
        </svg>
    `)

    await sharp(baseImagePath)
        .composite([{ input: svgOverlay, top: 0, left: 0 }])
        .toFile(uniqueImagePath)

    return uniqueImageName
}

// Register as task
on('task', {
    async 'runTask:generateUniqueImage'(baseImageName) {
        return generateUniqueImage(baseImageName)
    },

    async 'runTask:deleteTempImages'() {
        const fixturesDir = path.resolve('cypress/fixtures')
        const files = fs.readdirSync(fixturesDir)
        let deletedCount = 0

        for (const file of files) {
            if (/^temp-\d+\.(jpg|jpeg|png|svg)$/i.test(file)) {
                fs.unlinkSync(path.join(fixturesDir, file))
                deletedCount++
            }
        }

        return `Deleted ${deletedCount} temporary image(s).`
    }
})

// Usage in test:
cy.task('runTask:generateUniqueImage', 'base-image.png')
    .then(uniqueName => {
        cy.get('input[type="file"]').attachFile(uniqueName)
    })
```

### 5. API-Based Test Data Setup

```javascript
describe('API Test Data Setup', () => {
    let createdApiId

    before(() => {
        // Create test data via API
        cy.task('runTask:apimCreateApiJson', {
            apiName: `TestAPI_${Date.now()}`,
            version: '1.0.0',
            endpoint: '/test',
            description: 'Automated test API'
        }).then(response => {
            createdApiId = response.apiId
        })
    })

    after(() => {
        // Cleanup test data
        cy.task('delete:deleteApiAsync', {
            apiId: createdApiId
        })
    })

    it('should use created API', () => {
        cy.visit(`/api-manager/apis/${createdApiId}`)
        cy.get('[qa-id="api-name"]').should('contain', 'TestAPI_')
    })
})
```

---

## 6. PARALLEL EXECUTION STRATEGY

### Architecture

```
┌─────────────────────────────────────────────────────────────┐
│            PARALLEL EXECUTION ARCHITECTURE                   │
└─────────────────────────────────────────────────────────────┘

Jenkins Trigger (Parameters: MAX_INSTANCES=10)
    │
    └─► npm run rungithubworkflow
            │
            └─► scripts/rungithubworkflow.js
                    │
                    └─► axios.post(
                          'github.com/repos/SnapLogic/cypress/actions/workflows/split.yml/dispatches',
                          { inputs: { maxinstances: 10 } }
                        )
                            │
GitHub Actions Workflow (.github/workflows/split.yml)
    │
    ├─► Matrix Strategy
    │      matrix:
    │        machines: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
    │
    └─► Parallel Jobs (10 machines)
            │
            ├─► Machine 1: SPLIT=10, SPLIT_INDEX=0
            ├─► Machine 2: SPLIT=10, SPLIT_INDEX=1
            ├─► Machine 3: SPLIT=10, SPLIT_INDEX=2
            │   ...
            └─► Machine 10: SPLIT=10, SPLIT_INDEX=9
                    │
            Each Machine Runs:
                    │
                    ├─► npm run cy:ci → node index.js
                    │
                    └─► cypress-split Plugin
                            │
                            ├─► Divides spec files
                            ├─► Machine 1 runs specs 1-10
                            ├─► Machine 2 runs specs 11-20
                            │   ...
                            └─► Machine 10 runs specs 91-100
                                    │
                    Results → TestRail
                            │
                    Aggregate in TestRail
```

### cypress-split Plugin Configuration

**Installation**: `"cypress-split": "^1.24.6"`

**File**: `cypress.config.js`

```javascript
setupNodeEvents(cypressOn, config) {
    const on = require('cypress-on-fix')(cypressOn)

    // Register cypress-split
    require('cypress-split')(on, config)

    return config
}
```

### GitHub Actions Workflow

**File**: `.github/workflows/split.yml`

```yaml
name: Run Cypress Tests
on:
  workflow_dispatch:
    inputs:
      team:
        description: 'Team name'
        type: string
        required: true
      maxinstances:
        description: 'Number of parallel containers'
        type: number
        default: 10
      browser:
        description: 'Browser'
        type: string
        default: 'chrome'
      testrailtestrunid:
        description: 'TestRail run ID'
        type: string

env:
  TEAM: ${{ inputs.team }}
  TESTRAIL_TESTRUN_ID: ${{ inputs.testrailtestrunid }}
  TESTRAIL_USERNAME: ${{ secrets.TESTRAIL_USERNAME }}
  TESTRAIL_PASSWORD: ${{ secrets.TESTRAIL_PASSWORD }}
  USERS_URL: ${{ secrets.USERS_URL }}
  USERS_TOKEN: ${{ secrets.USERS_TOKEN }}

jobs:
  test:
    runs-on: ubuntu-latest
    strategy:
      fail-fast: false
      matrix:
        machines: ${{ fromJSON(format('[{0}]', join(range(1, inputs.maxinstances + 1), ','))) }}

    steps:
      - name: Checkout
        uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: 18
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run Cypress Tests
        env:
          SPLIT: ${{ inputs.maxinstances }}
          SPLIT_INDEX: ${{ strategy.job-index }}
          BROWSER: ${{ inputs.browser }}
        run: npm run cy:ci

      - name: Upload videos on failure
        if: failure()
        uses: actions/upload-artifact@v3
        with:
          name: cypress-videos-${{ matrix.machines }}
          path: cypress/videos
          retention-days: 7

      - name: Upload screenshots on failure
        if: failure()
        uses: actions/upload-artifact@v3
        with:
          name: cypress-screenshots-${{ matrix.machines }}
          path: cypress/screenshots
          retention-days: 7
```

### Trigger from Jenkins

**File**: `cypress/scripts/rungithubworkflow.js`

```javascript
const axios = require('axios')

const owner = 'SnapLogic'
const repo = 'cypress'
const workflowId = 'split.yml'
const githubToken = process.env.GITHUB_TOKEN

async function triggerGithubAction() {
    const inputs = {
        browser: process.env.BROWSER,
        maxinstances: process.env.MAX_INSTANCES,
        team: process.env.TEAM,
        testrailtestrunid: process.env.TESTRAIL_TESTRUN_ID,
        testrailmodule: process.env.TESTRAIL_MODULE,
        testrailtestcaseid: process.env.TESTRAIL_CASE_ID,
        testrailpriority: process.env.TESTRAIL_PRIORITY
    }

    const url = `https://api.github.com/repos/${owner}/${repo}/actions/workflows/${workflowId}/dispatches`

    try {
        const response = await axios.post(
            url,
            {
                inputs,
                ref: process.env.BRANCH || 'ImpCySplit'
            },
            {
                headers: {
                    Authorization: `Bearer ${githubToken}`,
                    Accept: 'application/vnd.github.v3+json'
                }
            }
        )

        console.log(`Workflow triggered successfully. Status: ${response.status}`)
    } catch (error) {
        console.error('Error triggering workflow:', error.response?.data || error.message)
    }
}

triggerGithubAction()
```

### Test Filtering with @cypress/grep

**Installation**: `"@cypress/grep": "4.1.0"`

**Configuration**: `cypress.config.js`

```javascript
require('@cypress/grep/src/plugin')(config)
```

**Usage**:

```javascript
// By TestRail ID
// npm run cy:ci -- --env grep="TC12003183;TC12003185"

// By tags
// npm run cy:ci -- --env grepTags="@smoke"

// In test:
it('TC12003168 User should be logged in',
   { tags: ['@smoke', '@critical', 'TC12003168'] },
   function() {
    cy.get('#logo').should('exist')
})
```

### Performance Comparison

#### Sequential Execution
```
100 tests × 2 minutes each = 200 minutes (3.3 hours)
```

#### Parallel Execution (10 machines)
```
100 tests ÷ 10 machines = 10 tests per machine
10 tests × 2 minutes = 20 minutes total
Speedup: 10x faster!
```

---

## 7. REPORTING STRATEGY

### Multi-Layered Reporting

```
Test Execution
    │
    ├─► 1. Console Logs (Real-time)
    │      └─► stdout/stderr in CI/CD
    │
    ├─► 2. Mochawesome Reports (Local)
    │      ├─► cypress/reports/mocha/*.json
    │      ├─► Merge → report.json
    │      └─► Generate HTML → report.html
    │
    ├─► 3. Cypress Videos/Screenshots
    │      ├─► cypress/videos/*.mp4 (on failure)
    │      └─► cypress/screenshots/*.png
    │
    ├─► 4. TestRail Integration
    │      ├─► After each spec: sendResults()
    │      ├─► Update test case results
    │      ├─► Attach version info
    │      └─► Calculate total runtime
    │
    └─► 5. Version Capture
           ├─► Capture before tests
           ├─► Update TestRail description
           └─► Track in all reports
```

### Mochawesome Configuration

**File**: `package.json`

```json
{
    "scripts": {
        "clean:reports": "rm -R -f cypress/reports && mkdir -p cypress/reports/mocha",
        "pretest": "npm run clean:reports",
        "combine-reports": "mochawesome-merge cypress/reports/mocha/*.json > cypress/reports/mochareports/report.json",
        "generate-report": "marge cypress/reports/mocha/mochawesome.json -f report -o cypress/reports/mochareports",
        "posttest": "npm run combine-reports && npm run generate-report"
    }
}
```

**Reporter Configuration** (commented in `cypress.config.js`):

```javascript
reporter: 'cypress-multi-reporters',
reporterOptions: {
    reporterEnabled: 'mochawesome',
    mochawesomeReporterOptions: {
        reportDir: 'cypress/reports/mocha',
        quite: true,
        overwrite: false,
        html: false,
        json: true
    }
}
```

### TestRail Integration

**File**: `cypress/scripts/testrail.js` (31KB!)

```javascript
const Testrail = require('testrail-api')

const testrail = new Testrail({
    host: process.env.TESTRAIL_HOST,
    user: process.env.TESTRAIL_USERNAME,
    password: process.env.TESTRAIL_PASSWORD
})

const statuses = {
    passed: 1,
    blocked: 2,
    untested: 3,
    retest: 4,
    failed: 5,
    autofail: 6
}

module.exports.sendResults = async (spec, results) => {
    if (!process.env.TESTRAIL_TESTRUN_ID) {
        console.log('No TestRail run ID, skipping result publishing')
        return
    }

    const testResults = results.tests.map(test => {
        // Extract TestRail ID from test title
        // "TC12003168 User should be logged in" → 12003168
        const match = test.title[test.title.length - 1].match(/TC(\d+)/)
        const caseId = match ? parseInt(match[1]) : null

        if (!caseId) return null

        return {
            case_id: caseId,
            status_id: test.state === 'passed' ? statuses.passed : statuses.failed,
            comment: test.displayError || 'Test passed',
            elapsed: `${Math.ceil(test.duration / 1000)}s`
        }
    }).filter(Boolean)

    if (testResults.length > 0) {
        await testrail.addResultsForCases(
            parseInt(process.env.TESTRAIL_TESTRUN_ID),
            { results: testResults }
        )
        console.log(`Published ${testResults.length} results to TestRail`)
    }
}
```

**Hook**: `cypress.config.js`

```javascript
on('after:spec', async (spec, results) => {
    await testrail.sendResults(spec, results)
})
```

### Version Capture

**File**: `cypress/scripts/versionCapture.js`

```javascript
const axios = require('axios')

module.exports.captureVersionInfo = async () => {
    try {
        const response = await axios.get(`${baseUrl}/api/version`)

        return {
            version: response.data.version,
            build: response.data.build,
            environment: env,
            timestamp: new Date().toISOString()
        }
    } catch (error) {
        console.error('Version capture failed:', error.message)
        return null
    }
}

module.exports.buildVersionInfoJson = () => {
    const versionInfo = global.versionInfo || {}
    return JSON.stringify(versionInfo, null, 2)
}
```

**Called in**: `index.js`

```javascript
async function captureAndUpdateVersionInfo() {
    if (!process.env.TESTRAIL_TESTRUN_ID) return

    console.log('[Version Capture] Starting...')
    const versionInfo = await versionCapture.captureVersionInfo()

    if (versionInfo) {
        const runID = process.env.TESTRAIL_TESTRUN_ID
        const description = versionCapture.buildVersionInfoJson()

        await testrail.updateRun(runID, { description })
        console.log('[Version Capture] Updated TestRail with version info')
    }
}
```

---

## Page Break

---
