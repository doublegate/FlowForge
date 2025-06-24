/**
 * FlowForge Database Seeder
 * 
 * This script populates the MongoDB database with sample workflow templates
 * and common GitHub Actions. It provides users with ready-to-use templates
 * for various CI/CD scenarios.
 * 
 * Usage: npm run seed
 * 
 * @version 1.0.0
 * @author FlowForge Team
 */

const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '..', '.env') });

// MongoDB connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/flowforge');

/**
 * Workflow Template Schema
 */
const WorkflowTemplateSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: String,
  category: String,
  template: Object,
  tags: [String],
  usageCount: { type: Number, default: 0 }
}, {
  timestamps: true
});

const WorkflowTemplate = mongoose.model('WorkflowTemplate', WorkflowTemplateSchema);

/**
 * Action Schema
 */
const ActionSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: String,
  repository: { type: String, required: true, unique: true },
  category: String,
  version: String,
  author: String,
  stars: Number,
  lastUpdated: Date,
  inputs: {
    type: Map,
    of: {
      description: String,
      required: Boolean,
      default: String,
      type: String
    }
  },
  outputs: {
    type: Map,
    of: {
      description: String
    }
  },
  runs: {
    using: String,
    main: String,
    pre: String,
    post: String
  },
  branding: {
    icon: String,
    color: String
  }
}, {
  timestamps: true
});

const Action = mongoose.model('Action', ActionSchema);

/**
 * Sample workflow templates for different use cases
 */
const workflowTemplates = [
  {
    name: 'Node.js CI/CD Pipeline',
    description: 'Complete CI/CD pipeline for Node.js applications with testing and deployment',
    category: 'nodejs',
    tags: ['node', 'javascript', 'npm', 'test', 'deploy'],
    template: {
      name: 'Node.js CI/CD',
      on: {
        push: {
          branches: ['main', 'develop']
        },
        pull_request: {
          branches: ['main']
        }
      },
      jobs: {
        test: {
          'runs-on': 'ubuntu-latest',
          strategy: {
            matrix: {
              'node-version': ['14.x', '16.x', '18.x']
            }
          },
          steps: [
            {
              uses: 'actions/checkout@v4'
            },
            {
              name: 'Use Node.js ${{ matrix.node-version }}',
              uses: 'actions/setup-node@v4',
              with: {
                'node-version': '${{ matrix.node-version }}',
                cache: 'npm'
              }
            },
            {
              name: 'Install dependencies',
              run: 'npm ci'
            },
            {
              name: 'Run tests',
              run: 'npm test'
            },
            {
              name: 'Run linter',
              run: 'npm run lint'
            },
            {
              name: 'Build project',
              run: 'npm run build'
            }
          ]
        },
        deploy: {
          needs: 'test',
          'runs-on': 'ubuntu-latest',
          if: 'github.ref == \'refs/heads/main\'',
          steps: [
            {
              uses: 'actions/checkout@v4'
            },
            {
              name: 'Deploy to production',
              run: 'echo "Deploy to production server"'
            }
          ]
        }
      }
    }
  },
  {
    name: 'Python Package CI/CD',
    description: 'Build, test, and publish Python packages to PyPI',
    category: 'python',
    tags: ['python', 'pip', 'pytest', 'pypi', 'package'],
    template: {
      name: 'Python Package',
      on: {
        push: {
          branches: ['main']
        },
        release: {
          types: ['created']
        }
      },
      jobs: {
        test: {
          'runs-on': 'ubuntu-latest',
          strategy: {
            matrix: {
              'python-version': ['3.8', '3.9', '3.10', '3.11']
            }
          },
          steps: [
            {
              uses: 'actions/checkout@v4'
            },
            {
              name: 'Set up Python ${{ matrix.python-version }}',
              uses: 'actions/setup-python@v4',
              with: {
                'python-version': '${{ matrix.python-version }}'
              }
            },
            {
              name: 'Install dependencies',
              run: `python -m pip install --upgrade pip
pip install flake8 pytest
if [ -f requirements.txt ]; then pip install -r requirements.txt; fi`
            },
            {
              name: 'Lint with flake8',
              run: `flake8 . --count --select=E9,F63,F7,F82 --show-source --statistics
flake8 . --count --exit-zero --max-complexity=10 --max-line-length=127 --statistics`
            },
            {
              name: 'Test with pytest',
              run: 'pytest'
            }
          ]
        },
        publish: {
          needs: 'test',
          'runs-on': 'ubuntu-latest',
          if: 'github.event_name == \'release\'',
          steps: [
            {
              uses: 'actions/checkout@v4'
            },
            {
              name: 'Set up Python',
              uses: 'actions/setup-python@v4',
              with: {
                'python-version': '3.x'
              }
            },
            {
              name: 'Install dependencies',
              run: `python -m pip install --upgrade pip
pip install build`
            },
            {
              name: 'Build package',
              run: 'python -m build'
            },
            {
              name: 'Publish to PyPI',
              uses: 'pypa/gh-action-pypi-publish@release/v1',
              with: {
                password: '${{ secrets.PYPI_API_TOKEN }}'
              }
            }
          ]
        }
      }
    }
  },
  {
    name: 'Docker Build and Push',
    description: 'Build Docker images and push to multiple registries',
    category: 'docker',
    tags: ['docker', 'container', 'registry', 'build'],
    template: {
      name: 'Docker Build and Push',
      on: {
        push: {
          branches: ['main'],
          tags: ['v*']
        }
      },
      env: {
        REGISTRY: 'ghcr.io',
        IMAGE_NAME: '${{ github.repository }}'
      },
      jobs: {
        build: {
          'runs-on': 'ubuntu-latest',
          permissions: {
            contents: 'read',
            packages: 'write'
          },
          steps: [
            {
              name: 'Checkout repository',
              uses: 'actions/checkout@v4'
            },
            {
              name: 'Set up Docker Buildx',
              uses: 'docker/setup-buildx-action@v3'
            },
            {
              name: 'Log in to GitHub Container Registry',
              uses: 'docker/login-action@v3',
              with: {
                registry: '${{ env.REGISTRY }}',
                username: '${{ github.actor }}',
                password: '${{ secrets.GITHUB_TOKEN }}'
              }
            },
            {
              name: 'Extract metadata',
              id: 'meta',
              uses: 'docker/metadata-action@v5',
              with: {
                images: '${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}'
              }
            },
            {
              name: 'Build and push Docker image',
              uses: 'docker/build-push-action@v5',
              with: {
                context: '.',
                push: true,
                tags: '${{ steps.meta.outputs.tags }}',
                labels: '${{ steps.meta.outputs.labels }}',
                cache_from: 'type=gha',
                cache_to: 'type=gha,mode=max'
              }
            }
          ]
        }
      }
    }
  },
  {
    name: 'Static Site Deployment',
    description: 'Build and deploy static sites to GitHub Pages',
    category: 'deployment',
    tags: ['static-site', 'github-pages', 'deploy', 'web'],
    template: {
      name: 'Deploy to GitHub Pages',
      on: {
        push: {
          branches: ['main']
        },
        workflow_dispatch: {}
      },
      permissions: {
        contents: 'read',
        pages: 'write',
        'id-token': 'write'
      },
      concurrency: {
        group: 'pages',
        'cancel-in-progress': true
      },
      jobs: {
        build: {
          'runs-on': 'ubuntu-latest',
          steps: [
            {
              name: 'Checkout',
              uses: 'actions/checkout@v4'
            },
            {
              name: 'Setup Node.js',
              uses: 'actions/setup-node@v4',
              with: {
                'node-version': '18',
                cache: 'npm'
              }
            },
            {
              name: 'Install dependencies',
              run: 'npm ci'
            },
            {
              name: 'Build site',
              run: 'npm run build'
            },
            {
              name: 'Upload artifact',
              uses: 'actions/upload-pages-artifact@v2',
              with: {
                path: './dist'
              }
            }
          ]
        },
        deploy: {
          environment: {
            name: 'github-pages',
            url: '${{ steps.deployment.outputs.page_url }}'
          },
          'runs-on': 'ubuntu-latest',
          needs: 'build',
          steps: [
            {
              name: 'Deploy to GitHub Pages',
              id: 'deployment',
              uses: 'actions/deploy-pages@v3'
            }
          ]
        }
      }
    }
  },
  {
    name: 'Rust CI/CD',
    description: 'Build and test Rust projects with cargo',
    category: 'rust',
    tags: ['rust', 'cargo', 'clippy', 'test'],
    template: {
      name: 'Rust CI',
      on: {
        push: {
          branches: ['main']
        },
        pull_request: {
          branches: ['main']
        }
      },
      env: {
        CARGO_TERM_COLOR: 'always'
      },
      jobs: {
        test: {
          'runs-on': 'ubuntu-latest',
          steps: [
            {
              uses: 'actions/checkout@v4'
            },
            {
              name: 'Install Rust',
              uses: 'actions-rs/toolchain@v1',
              with: {
                toolchain: 'stable',
                override: true,
                components: 'rustfmt, clippy'
              }
            },
            {
              name: 'Cache cargo registry',
              uses: 'actions/cache@v3',
              with: {
                path: '~/.cargo/registry',
                key: '${{ runner.os }}-cargo-registry-${{ hashFiles(\'**/Cargo.lock\') }}'
              }
            },
            {
              name: 'Cache cargo index',
              uses: 'actions/cache@v3',
              with: {
                path: '~/.cargo/git',
                key: '${{ runner.os }}-cargo-index-${{ hashFiles(\'**/Cargo.lock\') }}'
              }
            },
            {
              name: 'Cache cargo build',
              uses: 'actions/cache@v3',
              with: {
                path: 'target',
                key: '${{ runner.os }}-cargo-build-target-${{ hashFiles(\'**/Cargo.lock\') }}'
              }
            },
            {
              name: 'Check formatting',
              run: 'cargo fmt -- --check'
            },
            {
              name: 'Run clippy',
              run: 'cargo clippy -- -D warnings'
            },
            {
              name: 'Run tests',
              run: 'cargo test --verbose'
            },
            {
              name: 'Build release',
              run: 'cargo build --release --verbose'
            }
          ]
        }
      }
    }
  },
  {
    name: 'Security Scanning Pipeline',
    description: 'Comprehensive security scanning for vulnerabilities',
    category: 'security',
    tags: ['security', 'scan', 'vulnerabilities', 'dependencies'],
    template: {
      name: 'Security Scan',
      on: {
        push: {
          branches: ['main']
        },
        schedule: [
          {
            cron: '0 0 * * 1'  // Weekly on Monday
          }
        ]
      },
      jobs: {
        security: {
          'runs-on': 'ubuntu-latest',
          steps: [
            {
              name: 'Checkout code',
              uses: 'actions/checkout@v4'
            },
            {
              name: 'Run Trivy vulnerability scanner',
              uses: 'aquasecurity/trivy-action@master',
              with: {
                'scan-type': 'fs',
                'scan-ref': '.',
                format: 'sarif',
                output: 'trivy-results.sarif'
              }
            },
            {
              name: 'Upload Trivy scan results',
              uses: 'github/codeql-action/upload-sarif@v2',
              with: {
                sarif_file: 'trivy-results.sarif'
              }
            },
            {
              name: 'Run Snyk to check for vulnerabilities',
              uses: 'snyk/actions/node@master',
              env: {
                SNYK_TOKEN: '${{ secrets.SNYK_TOKEN }}'
              }
            },
            {
              name: 'Initialize CodeQL',
              uses: 'github/codeql-action/init@v2',
              with: {
                languages: 'javascript'
              }
            },
            {
              name: 'Autobuild',
              uses: 'github/codeql-action/autobuild@v2'
            },
            {
              name: 'Perform CodeQL Analysis',
              uses: 'github/codeql-action/analyze@v2'
            }
          ]
        }
      }
    }
  }
];

/**
 * Transform action data to match Mongoose schema with Map types
 */
function transformActionData(action) {
  const transformed = { ...action };
  
  // Convert inputs object to Map
  if (action.inputs) {
    transformed.inputs = new Map(Object.entries(action.inputs));
  }
  
  // Convert outputs object to Map
  if (action.outputs) {
    transformed.outputs = new Map(Object.entries(action.outputs));
  }
  
  // Add lastUpdated if not present
  if (!transformed.lastUpdated) {
    transformed.lastUpdated = new Date();
  }
  
  return transformed;
}

/**
 * Sample GitHub Actions to seed the database
 */
const sampleActions = [
  {
    name: 'Checkout',
    description: 'Checkout a Git repository at a particular version',
    repository: 'actions/checkout@v4',
    category: 'setup',
    author: 'actions',
    stars: 5000,
    inputs: {
      repository: {
        description: 'Repository name with owner',
        required: false,
        default: '${{ github.repository }}',
        type: 'string'
      },
      ref: {
        description: 'The branch, tag or SHA to checkout',
        required: false,
        type: 'string'
      },
      token: {
        description: 'Personal access token',
        required: false,
        default: '${{ github.token }}',
        type: 'string'
      },
      'fetch-depth': {
        description: 'Number of commits to fetch',
        required: false,
        default: '1',
        type: 'number'
      }
    },
    branding: {
      icon: 'download',
      color: 'green'
    }
  },
  {
    name: 'Setup Node.js',
    description: 'Set up a specific version of Node.js',
    repository: 'actions/setup-node@v4',
    category: 'setup',
    author: 'actions',
    stars: 3000,
    inputs: {
      'node-version': {
        description: 'Version Spec of the version to use',
        required: true,
        type: 'string'
      },
      cache: {
        description: 'Used to specify a package manager for caching',
        required: false,
        type: 'string'
      },
      'cache-dependency-path': {
        description: 'Path to dependency file',
        required: false,
        type: 'string'
      }
    },
    branding: {
      icon: 'code',
      color: 'green'
    }
  },
  {
    name: 'Cache',
    description: 'Cache dependencies and build outputs',
    repository: 'actions/cache@v3',
    category: 'utilities',
    author: 'actions',
    stars: 4000,
    inputs: {
      path: {
        description: 'A list of files, directories, and wildcard patterns to cache',
        required: true,
        type: 'string'
      },
      key: {
        description: 'An explicit key for restoring and saving the cache',
        required: true,
        type: 'string'
      },
      'restore-keys': {
        description: 'An ordered list of keys to use for restoring stale cache',
        required: false,
        type: 'string'
      }
    },
    outputs: {
      'cache-hit': {
        description: 'A boolean value to indicate an exact match was found'
      }
    },
    branding: {
      icon: 'archive',
      color: 'gray-dark'
    }
  },
  {
    name: 'Upload Artifact',
    description: 'Upload a build artifact',
    repository: 'actions/upload-artifact@v3',
    category: 'utilities',
    author: 'actions',
    stars: 2500,
    inputs: {
      name: {
        description: 'Artifact name',
        required: true,
        type: 'string'
      },
      path: {
        description: 'A file, directory or wildcard pattern',
        required: true,
        type: 'string'
      },
      'retention-days': {
        description: 'Number of days to retain artifact',
        required: false,
        default: '90',
        type: 'number'
      }
    },
    branding: {
      icon: 'upload',
      color: 'gray-dark'
    }
  },
  {
    name: 'Setup Python',
    description: 'Set up a specific version of Python',
    repository: 'actions/setup-python@v4',
    category: 'setup',
    author: 'actions',
    stars: 2800,
    inputs: {
      'python-version': {
        description: 'Version range or exact version of Python',
        required: true,
        type: 'string'
      },
      cache: {
        description: 'Used to specify a package manager for caching',
        required: false,
        type: 'string'
      },
      architecture: {
        description: 'The target architecture',
        required: false,
        type: 'string'
      }
    },
    branding: {
      icon: 'code',
      color: 'yellow'
    }
  }
];

/**
 * Seed the database with templates and actions
 */
async function seedDatabase() {
  try {
    console.log('🌱 Starting database seeding...');
    
    // Wait for connection to be ready
    await mongoose.connection.asPromise();
    console.log('✅ Connected to MongoDB');

    // Clear existing data
    await WorkflowTemplate.deleteMany({});
    await Action.deleteMany({});
    console.log('✅ Cleared existing data');

    // Insert workflow templates
    const insertedTemplates = await WorkflowTemplate.insertMany(workflowTemplates);
    console.log(`✅ Inserted ${insertedTemplates.length} workflow templates`);

    // Insert sample actions
    const transformedActions = sampleActions.map(transformActionData);
    const insertedActions = await Action.insertMany(transformedActions);
    console.log(`✅ Inserted ${insertedActions.length} sample actions`);

    // Log summary
    console.log('\n📊 Seeding Summary:');
    console.log(`   - Workflow Templates: ${insertedTemplates.length}`);
    console.log(`   - Sample Actions: ${insertedActions.length}`);
    
    // List templates by category
    const categories = [...new Set(workflowTemplates.map(t => t.category))];
    console.log('\n📁 Template Categories:');
    categories.forEach(cat => {
      const count = workflowTemplates.filter(t => t.category === cat).length;
      console.log(`   - ${cat}: ${count} templates`);
    });

    console.log('\n✨ Database seeding completed successfully!');
  } catch (error) {
    console.error('❌ Error seeding database:', error);
  } finally {
    await mongoose.connection.close();
    console.log('👋 Database connection closed');
  }
}

// Run the seeder
mongoose.connection.on('connected', () => {
  seedDatabase();
});

mongoose.connection.on('error', (err) => {
  console.error('MongoDB connection error:', err);
  process.exit(1);
});