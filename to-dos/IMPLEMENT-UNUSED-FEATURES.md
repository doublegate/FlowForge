# Implementation Plan: Unused Features & TypeScript Types

## Overview

This document outlines the implementation plan for all features that were scaffolded but not completed, as evidenced by unused variables/parameters that were prefixed with underscores during ESLint fixes. Additionally, it addresses the TypeScript `any` type warnings.

## Priority 1: Critical Features for Phase Completion

### 1.1 Fix Sample Actions Seeding (Backend)

**File**: `backend/seed.js`  
**Variable**: `_sampleActions`  
**Status**: Schema mismatch preventing database seeding

**Implementation Steps**:
1. Convert Map types to plain objects for Mongoose compatibility
2. Transform the sample actions data structure:
   ```javascript
   // Convert from:
   inputs: new Map([['key', { description: '...', required: true }]])
   // To:
   inputs: { key: { description: '...', required: true } }
   ```
3. Create data transformation utility function
4. Test seeding with `npm run seed`
5. Verify actions appear in frontend sidebar

**Reference**: See `backend/models/Action.js` for schema definition

### 1.2 Multi-Job Workflow Support (Frontend)

**File**: `frontend/src/components/WorkflowManager.tsx`  
**Variable**: `_edges`  
**Status**: Currently only generates single-job workflows

**Implementation Steps**:
1. Parse React Flow edges to determine job dependencies
2. Create job dependency mapping algorithm
3. Generate YAML with proper `needs:` arrays
4. Support for:
   - Sequential jobs (A → B → C)
   - Parallel jobs (A → [B, C] → D)
   - Complex DAGs
5. Update YAML generation to include multiple jobs

**Reference**: See `docs/PHASE-2-AI-INTEGRATION.md` for workflow complexity requirements

### 1.3 Server Instance Management (Backend)

**File**: `backend/index.js`  
**Variable**: `_server`  
**Status**: Server starts but instance not stored for management

**Implementation Steps**:
1. Store server instance globally
2. Implement graceful shutdown:
   ```javascript
   process.on('SIGTERM', () => {
     server.close(() => {
       mongoose.connection.close();
       process.exit(0);
     });
   });
   ```
3. Add health check endpoint that uses server stats
4. Prepare for WebSocket upgrade (Phase 3)

## Priority 2: Enhanced Features

### 2.1 Technology-Specific Categorization

**File**: `backend/utils/actionCategorizer.js`  
**Variable**: `_tech`  
**Status**: Tech detection exists but not used for categorization

**Implementation Steps**:
1. Create tech-specific subcategories:
   - `setup-nodejs`, `setup-python`, `setup-docker`
   - `test-jest`, `test-pytest`, `test-mocha`
2. Enhance categorization algorithm to use tech keywords
3. Add tech filtering to API endpoints
4. Update frontend to show tech badges on actions

### 2.2 Workflow Edge Analysis

**File**: `frontend/src/components/WorkflowSuggestions.tsx`  
**Variable**: `_edges`  
**Status**: Only analyzes nodes, not connections

**Implementation Steps**:
1. Implement edge analysis algorithms:
   - Detect sequential steps that could run in parallel
   - Find redundant paths
   - Identify bottlenecks
2. Generate suggestions like:
   - "Jobs B and C don't depend on each other - run in parallel"
   - "Combine test and lint jobs for faster execution"
3. Add visualization of suggested optimizations

### 2.3 Global Action State

**File**: `frontend/src/App.tsx`  
**Variable**: `_currentAction`  
**Status**: State exists but not utilized

**Implementation Steps**:
1. Implement action detail panel showing:
   - Full description
   - All inputs/outputs
   - Example usage
   - Version history
2. Add keyboard shortcuts (press 'i' for info on selected action)
3. Show contextual help based on current action
4. Implement action comparison mode

## Priority 3: TypeScript Type Improvements

### 3.1 Backend API Response Types

**Files**: All frontend service and component files  
**Current**: Using `any` for API responses

**Implementation Steps**:
1. Create comprehensive type definitions:
   ```typescript
   // types/api.ts
   export interface ActionResponse {
     _id: string;
     name: string;
     description: string;
     repository: string;
     category: string;
     inputs: Record<string, ActionInput>;
     outputs: Record<string, ActionOutput>;
   }
   
   export interface WorkflowGenerationResponse {
     workflow: WorkflowDefinition;
     explanation: string;
     suggestions: string[];
   }
   ```

2. Update all API service methods with proper return types
3. Replace all `any` types in components with specific interfaces
4. Add type guards for runtime validation

### 3.2 React Flow Node Types

**Files**: Canvas.tsx, ActionNode.tsx  
**Current**: Using `any` for node data

**Implementation Steps**:
1. Define custom node types:
   ```typescript
   interface ActionNodeData {
     action: ActionMetadata;
     config: Record<string, string>;
     validation: ValidationResult;
   }
   ```
2. Create typed React Flow hooks
3. Implement proper edge types with connection rules

## Priority 4: Advanced Discovery Features

### 4.1 Extended Action Sources

**File**: `backend/utils/actionDiscovery.js`  
**Variables**: `_axios`, `_cheerio`  
**Status**: Only using GitHub API currently

**Implementation Steps**:
1. Implement marketplace scraping for:
   - Download counts
   - User ratings
   - Example workflows
2. Add support for GitLab CI/CD templates
3. Create custom action registry support
4. Implement caching layer for scraped data

### 4.2 Enhanced Validation Feedback

**File**: `backend/index.js`  
**Variable**: `_stdout`  
**Status**: Only parsing errors, not warnings

**Implementation Steps**:
1. Parse actionlint stdout for:
   - Deprecation warnings
   - Performance suggestions
   - Security recommendations
2. Categorize feedback by severity
3. Show inline warnings in YAML preview
4. Add "Fix automatically" options where possible

## Implementation Schedule

### Week 1: Critical Features
- [ ] Fix sample actions seeding (Day 1-2)
- [ ] Implement multi-job workflow support (Day 3-4)
- [ ] Add server instance management (Day 5)

### Week 2: Enhanced Features & Types
- [ ] Technology-specific categorization (Day 1-2)
- [ ] Workflow edge analysis (Day 3-4)
- [ ] TypeScript type improvements (Day 5)

### Week 3: Advanced Features
- [ ] Extended action discovery
- [ ] Enhanced validation feedback
- [ ] Global action state management

## Testing Requirements

For each implementation:
1. Unit tests for new functions
2. Integration tests for API changes
3. E2E tests for UI features
4. Performance benchmarks for analysis algorithms

## Success Metrics

- All ESLint warnings resolved
- 100% of scaffolded features implemented
- Type coverage > 95%
- No runtime type errors
- All tests passing

## Dependencies

- Phase 1 & 2 completion (✓)
- MongoDB indexes for tech-specific queries
- React Flow v11+ for edge analysis
- TypeScript 5.3+ for satisfies operator

## Notes

- Maintain backward compatibility with existing workflows
- Document all new API endpoints
- Update OpenAPI spec for type generation
- Consider performance impact of edge analysis algorithms