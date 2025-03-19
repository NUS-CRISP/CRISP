// batchExportPRDiagrams.js
import fs from 'fs';
import path from 'path';
import puppeteer from 'puppeteer';

/**
 * This script automates the export of PR Arc Diagrams for all week ranges
 * It launches a headless browser, navigates to your app, and saves the 
 * SVG diagrams as PNG files.
 */

async function exportPRDiagrams() {
  // Launch a headless browser
  const browser = await puppeteer.launch({
    headless: true,
    defaultViewport: {
      width: 800,
      height: 800,
    },
  });

  try {
    // Create output directory if it doesn't exist
    const outputDir = path.join(process.cwd(), 'pr-diagrams');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir);
    }

    console.log('Starting export process...');
    const page = await browser.newPage();
    
    // Navigate to your app (replace with your actual URL)
    // You can use localhost in development mode
    await page.goto('http://localhost:3000/team-review', {
      waitUntil: 'networkidle2',
    });
    
    // Wait for the app to load fully
    await page.waitForSelector('svg');
    console.log('Page loaded successfully');

    // Loop through all week ranges from 1-2 to 1-15
    for (let endWeek = 1; endWeek <= 14; endWeek++) {
      const weekRange = `1-${endWeek + 1}`;
      console.log(`Processing week range ${weekRange}...`);
      
      // Set the range slider to the current range
      // This is a bit complex as we need to interact with your specific UI
      // This is a simplified example - you'll need to adjust selectors based on your app
      await page.evaluate((startWeek, endWeek) => {
        // Find your range slider and programmatically change its value
        // This is just an example - you need to adapt to your actual UI components
        const rangeSliderElement = document.querySelector('.mantine-RangeSlider-root');
        if (rangeSliderElement) {
          // Set the range values (assuming you have a function or API to do this)
          // This is pseudocode - replace with actual implementation
          window.setSelectedWeekRange([startWeek - 1, endWeek - 1]);
        }
      }, 1, endWeek + 1);
      
      // Wait for the diagram to update
      await page.waitForTimeout(1000);
      
      // Capture the SVG
      const svgElement = await page.$('svg');
      if (svgElement) {
        // Save screenshot of the SVG element
        await svgElement.screenshot({
          path: path.join(outputDir, `pr_arc_diagram_week_${weekRange}.png`),
          omitBackground: false,
        });
        console.log(`Saved diagram for week range ${weekRange}`);
      } else {
        console.error(`SVG element not found for week range ${weekRange}`);
      }
    }
    
    console.log('Export complete! Files saved to:', outputDir);
  } catch (error) {
    console.error('Error during export:', error);
  } finally {
    await browser.close();
  }
}

// Run the export function
exportPRDiagrams().catch(console.error);