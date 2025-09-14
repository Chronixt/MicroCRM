// Standalone migration function for testing
// This replicates the migration logic from app.js for testing purposes

// Convert old HTML notes to SVG format
function convertHtmlNotesToSVG(htmlContent) {
  console.log(`🔧 Converting HTML to SVG: "${htmlContent}"`);
  
  // Create a temporary div to parse the HTML
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = htmlContent;
  
  // Extract text content and basic styling
  const textContent = tempDiv.textContent || tempDiv.innerText || '';
  console.log(`🔧 Extracted text content: "${textContent}"`);
  
  if (!textContent.trim()) {
    console.log(`🔧 No text content found, returning empty SVG`);
    return ''; // Return empty if no content
  }
  
  // Calculate dynamic height based on text content
  const lines = textContent.split('\n').filter(line => line.trim());
  const lineHeight = 20;
  const padding = 20;
  const minHeight = 60;
  const calculatedHeight = Math.max(minHeight, (lines.length * lineHeight) + padding);
  
  // Create SVG with the text content
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('width', '400');
  svg.setAttribute('height', calculatedHeight);
  svg.setAttribute('viewBox', `0 0 400 ${calculatedHeight}`);
  svg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  
  // Create text element
  const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
  text.setAttribute('x', '10');
  text.setAttribute('y', '30');
  text.setAttribute('font-family', 'Arial, sans-serif');
  text.setAttribute('font-size', '16');
  text.setAttribute('fill', '#ffffff');
  text.setAttribute('white-space', 'pre-wrap');
  
  // Handle line breaks and wrap long lines
  const lines = textContent.split('\n');
  const maxCharsPerLine = 50; // Approximate characters per line
  let processedLines = [];
  
  lines.forEach(line => {
    if (line.trim()) {
      // If line is too long, wrap it
      if (line.length > maxCharsPerLine) {
        const words = line.split(' ');
        let currentLine = '';
        
        words.forEach(word => {
          if ((currentLine + ' ' + word).length > maxCharsPerLine && currentLine.length > 0) {
            processedLines.push(currentLine.trim());
            currentLine = word;
          } else {
            currentLine += (currentLine.length > 0 ? ' ' : '') + word;
          }
        });
        
        if (currentLine.trim()) {
          processedLines.push(currentLine.trim());
        }
      } else {
        processedLines.push(line.trim());
      }
    }
  });
  
  // Create tspan elements for each processed line
  processedLines.forEach((line, index) => {
    const tspan = document.createElementNS('http://www.w3.org/2000/svg', 'tspan');
    tspan.setAttribute('x', '10');
    tspan.setAttribute('dy', index === 0 ? '0' : '20');
    tspan.textContent = line;
    text.appendChild(tspan);
  });
  
  svg.appendChild(text);
  
  const svgString = new XMLSerializer().serializeToString(svg);
  console.log(`🔧 Generated SVG: ${svgString}`);
  console.log(`🔧 SVG length: ${svgString.length}`);
  
  return svgString;
}

// Migration function to convert old notesHtml to new SVG notes system
async function migrateOldNotes() {
  try {
    console.log('🧪 Starting migration test...');
    
    // Get all customers from the database
    const customers = await ChikasDB.getAllCustomers();
    let migratedCount = 0;
    
    console.log(`Found ${customers.length} total customers`);
    
    for (const customer of customers) {
      if (customer.notesHtml && customer.notesHtml.trim() !== '' && customer.notesHtml !== '<p><br></p>') {
        console.log(`📝 Migrating notes for customer ${customer.id}: ${customer.firstName} ${customer.lastName}`);
        console.log(`   Original notesHtml: ${customer.notesHtml}`);
        
        // Convert HTML notes to SVG
        const svgContent = convertHtmlNotesToSVG(customer.notesHtml);
        console.log(`   Converted SVG: ${svgContent}`);
        console.log(`   SVG length: ${svgContent.length}`);
        console.log(`   SVG is empty: ${svgContent.trim() === ''}`);
        
        // Create a note entry for the old notes
        const noteData = {
          id: Date.now() + Math.random(), // Unique ID
          svg: svgContent,
          date: customer.createdAt ? new Date(customer.createdAt).toLocaleDateString() : new Date().toLocaleDateString(),
          noteNumber: 1 // First note for this customer
        };
        
        console.log(`   Created note data:`, noteData);
        
        // Get existing notes for this customer
        const existingNotes = JSON.parse(localStorage.getItem('customerNotes') || '{}');
        if (!existingNotes[customer.id]) {
          existingNotes[customer.id] = [];
        }
        
        // Add the migrated note
        existingNotes[customer.id].push(noteData);
        
        // Save back to localStorage
        localStorage.setItem('customerNotes', JSON.stringify(existingNotes));
        console.log(`   ✅ Saved to localStorage for customer ${customer.id}`);
        
        // Remove the old notesHtml from the customer record
        const updatedCustomer = { ...customer };
        delete updatedCustomer.notesHtml;
        await ChikasDB.updateCustomer(updatedCustomer);
        console.log(`   ✅ Removed notesHtml from customer record`);
        
        migratedCount++;
      } else if (customer.notesHtml) {
        console.log(`⏭️  Skipping customer ${customer.id}: empty or invalid notesHtml (${customer.notesHtml})`);
      }
    }
    
    console.log(`🎉 Migration test completed. Migrated ${migratedCount} customers' notes.`);
    
    // Show detailed results
    const customerNotes = JSON.parse(localStorage.getItem('customerNotes') || '{}');
    console.log('📊 Final localStorage state:', customerNotes);
    
    return {
      success: true,
      migratedCount,
      totalCustomers: customers.length,
      customerNotes
    };
    
  } catch (error) {
    console.error('❌ Error during migration test:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

// Test function to verify migration results
async function verifyMigrationResults() {
  try {
    console.log('🔍 Verifying migration results...');
    
    // Check localStorage for migrated notes
    const customerNotes = JSON.parse(localStorage.getItem('customerNotes') || '{}');
    const totalNotes = Object.values(customerNotes).reduce((sum, notes) => sum + notes.length, 0);
    
    console.log(`📊 Found ${Object.keys(customerNotes).length} customers with notes`);
    console.log(`📊 Total notes: ${totalNotes}`);
    
    // Check IndexedDB for cleaned customers
    const customers = await ChikasDB.getAllCustomers();
    const customersWithNotesHtml = customers.filter(c => c.notesHtml !== undefined);
    
    console.log(`📊 Customers still with notesHtml: ${customersWithNotesHtml.length}`);
    
    // Show details for each migrated customer
    Object.keys(customerNotes).forEach(customerId => {
      const notes = customerNotes[customerId];
      console.log(`👤 Customer ${customerId}: ${notes.length} notes`);
      notes.forEach((note, index) => {
        console.log(`   📝 Note ${index + 1}: ${note.date} (${note.noteNumber})`);
        console.log(`      SVG: ${note.svg.substring(0, 100)}...`);
      });
    });
    
    return {
      success: true,
      totalCustomers: customers.length,
      customersWithNotes: Object.keys(customerNotes).length,
      totalNotes,
      customersStillWithNotesHtml: customersWithNotesHtml.length
    };
    
  } catch (error) {
    console.error('❌ Error verifying migration results:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

// Export functions for use in test page
window.migrateOldNotes = migrateOldNotes;
window.verifyMigrationResults = verifyMigrationResults;
window.convertHtmlNotesToSVG = convertHtmlNotesToSVG;
