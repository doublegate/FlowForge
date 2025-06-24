/**
 * FlowForge Action Update Script
 * 
 * This script updates the action database by fetching the latest
 * actions from the Awesome Actions repository and updating their metadata.
 * 
 * Usage: npm run update-actions
 */

require('dotenv').config();
const mongoose = require('mongoose');
const { fetchAwesomeActions, fetchActionMetadata } = require('../utils/actionDiscovery');

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/flowforge', {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

// Import Action model
const Action = require('../models/Action');

async function updateActions() {
  console.log('🔄 Starting action database update...');
  
  try {
    // Fetch all actions from Awesome Actions
    const actions = await fetchAwesomeActions();
    console.log(`📦 Found ${actions.length} actions to process`);
    
    let updated = 0;
    let failed = 0;
    let skipped = 0;
    
    // Process in batches to avoid rate limiting
    const batchSize = 10;
    for (let i = 0; i < actions.length; i += batchSize) {
      const batch = actions.slice(i, i + batchSize);
      
      console.log(`\n🔍 Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(actions.length / batchSize)}`);
      
      await Promise.all(batch.map(async (action) => {
        try {
          // Fetch detailed metadata
          const metadata = await fetchActionMetadata(action.owner, action.repo);
          
          if (!metadata) {
            console.log(`⚠️  Skipping ${action.fullName} - no action.yml found`);
            skipped++;
            return;
          }
          
          // Update or create action in database
          await Action.findOneAndUpdate(
            { repository: metadata.repository },
            {
              name: metadata.name,
              description: metadata.description,
              repository: metadata.repository,
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
          
          console.log(`✅ Updated ${action.fullName}`);
          updated++;
        } catch (error) {
          console.error(`❌ Failed to update ${action.fullName}:`, error.message);
          failed++;
        }
      }));
      
      // Rate limit pause between batches
      if (i + batchSize < actions.length) {
        console.log('⏳ Pausing for rate limit...');
        await new Promise(resolve => setTimeout(resolve, 2000));
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