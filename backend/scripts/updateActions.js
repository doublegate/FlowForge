/**
 * FlowForge Action Update Script
 * 
 * This script updates the action database by fetching the latest
 * actions from the Awesome Actions repository and updating their metadata.
 * 
 * Usage: npm run update-actions
 */

require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const mongoose = require('mongoose');
const { fetchAwesomeActions, fetchActionMetadata } = require('../utils/actionDiscovery');

// Verify environment variables
if (!process.env.MONGODB_URI) {
  console.error('❌ MONGODB_URI environment variable is required');
  process.exit(1);
}

if (!process.env.GITHUB_TOKEN) {
  console.error('❌ GITHUB_TOKEN environment variable is required');
  console.error('   Create a token at: https://github.com/settings/tokens');
  process.exit(1);
}

console.log('✅ Environment variables loaded');
console.log(`📡 GitHub token detected (${process.env.GITHUB_TOKEN.substring(0, 8)}...)`);

// Connect to MongoDB with proper error handling
async function connectToDatabase() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error.message);
    process.exit(1);
  }
}

// Import Action model
const Action = require('../models/Action');

async function updateActions() {
  console.log('🔄 Starting action database update...');
  
  // Connect to database first
  await connectToDatabase();
  
  try {
    // Fetch all actions from Awesome Actions
    const actions = await fetchAwesomeActions();
    console.log(`📦 Found ${actions.length} actions to process`);
    
    let updated = 0;
    let failed = 0;
    let skipped = 0;
    
    // Process in smaller batches to avoid rate limiting
    const batchSize = 5; // Reduced batch size
    for (let i = 0; i < actions.length; i += batchSize) {
      const batch = actions.slice(i, i + batchSize);
      
      console.log(`\n🔍 Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(actions.length / batchSize)}`);
      
      // Process batch items sequentially to avoid overwhelming the API
      for (const action of batch) {
        try {
          // Fetch detailed metadata (could be action or array of workflows)
          const metadata = await fetchActionMetadata(action.owner, action.repo);
          
          if (!metadata) {
            console.log(`⚠️  Skipping ${action.fullName} - no action or workflow found`);
            skipped++;
            continue;
          }
          
          // Handle array of workflows
          if (Array.isArray(metadata)) {
            for (const workflow of metadata) {
              await Action.findOneAndUpdate(
                { repository: workflow.repository, workflowPath: workflow.workflowPath },
                {
                  name: workflow.name,
                  description: workflow.description,
                  repository: workflow.repository,
                  type: 'workflow',
                  category: workflow.category,
                  author: workflow.author,
                  stars: workflow.stars,
                  lastUpdated: workflow.lastUpdated,
                  inputs: workflow.inputs,
                  outputs: workflow.outputs,
                  workflowPath: workflow.workflowPath,
                  triggers: workflow.triggers
                },
                { upsert: true, new: true }
              );
              console.log(`✅ Updated workflow ${workflow.name} in ${action.fullName}`);
            }
            updated += metadata.length;
          } else {
            // Handle single action
            await Action.findOneAndUpdate(
              { repository: metadata.repository },
              {
                name: metadata.name,
                description: metadata.description,
                repository: metadata.repository,
                type: 'action',
                category: metadata.category,
                author: metadata.author,
                stars: metadata.stars,
                lastUpdated: metadata.lastUpdated,
                inputs: metadata.inputs,
                outputs: metadata.outputs,
                runs: metadata.runs,
                branding: metadata.branding
              },
              { upsert: true, new: true }
            );
            console.log(`✅ Updated action ${action.fullName}`);
            updated++;
          }
        } catch (error) {
          if (error.message.includes('API rate limit exceeded')) {
            console.log('⏳ Rate limit hit, waiting 60 seconds...');
            await new Promise(resolve => setTimeout(resolve, 60000));
            // Retry this action
            try {
              const metadata = await fetchActionMetadata(action.owner, action.repo);
              if (metadata) {
                if (Array.isArray(metadata)) {
                  for (const workflow of metadata) {
                    await Action.findOneAndUpdate(
                      { repository: workflow.repository, workflowPath: workflow.workflowPath },
                      {
                        name: workflow.name,
                        description: workflow.description,
                        repository: workflow.repository,
                        type: 'workflow',
                        category: workflow.category,
                        author: workflow.author,
                        stars: workflow.stars,
                        lastUpdated: workflow.lastUpdated,
                        inputs: workflow.inputs,
                        outputs: workflow.outputs,
                        workflowPath: workflow.workflowPath,
                        triggers: workflow.triggers
                      },
                      { upsert: true, new: true }
                    );
                  }
                  console.log(`✅ Updated ${metadata.length} workflow(s) in ${action.fullName} (after retry)`);
                  updated += metadata.length;
                } else {
                  await Action.findOneAndUpdate(
                    { repository: metadata.repository },
                    {
                      name: metadata.name,
                      description: metadata.description,
                      repository: metadata.repository,
                      type: 'action',
                      category: metadata.category,
                      author: metadata.author,
                      stars: metadata.stars,
                      lastUpdated: metadata.lastUpdated,
                      inputs: metadata.inputs,
                      outputs: metadata.outputs,
                      runs: metadata.runs,
                      branding: metadata.branding
                    },
                    { upsert: true, new: true }
                  );
                  console.log(`✅ Updated ${action.fullName} (after retry)`);
                  updated++;
                }
              } else {
                console.log(`⚠️  Skipping ${action.fullName} - no action or workflow found (after retry)`);
                skipped++;
              }
            } catch (retryError) {
              console.error(`❌ Failed to update ${action.fullName} (retry):`, retryError.message);
              failed++;
            }
          } else {
            console.error(`❌ Failed to update ${action.fullName}:`, error.message);
            failed++;
          }
        }
        
        // Small delay between each action
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      
      // Longer pause between batches
      if (i + batchSize < actions.length) {
        console.log('⏳ Pausing for rate limit...');
        await new Promise(resolve => setTimeout(resolve, 5000));
      }
    }
    
    console.log('\n📊 Update Summary:');
    console.log(`   ✅ Updated: ${updated}`);
    console.log(`   ⚠️  Skipped: ${skipped}`);
    console.log(`   ❌ Failed: ${failed}`);
    console.log(`   📦 Total: ${actions.length}`);
    
  } catch (error) {
    console.error('💥 Update failed:', error);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log('\n👋 Database connection closed');
  }
}

// Run the update
updateActions();