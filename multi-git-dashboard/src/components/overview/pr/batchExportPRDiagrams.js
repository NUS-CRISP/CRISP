import fs from 'fs';
import path from 'path';
import puppeteer from 'puppeteer';

/**
 * This script automates the export of PR Arc Diagrams for all week ranges
 * It launches a headless browser, navigates to your app, and saves the
 * SVG diagrams as PNG files.
 */

async function exportPRDiagrams() {
  const browser = await puppeteer.launch({
    headless: true,
    defaultViewport: {
      width: 800,
      height: 800,
    },
  });

  try {
    const outputDir = path.join(process.cwd(), 'pr-diagrams');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir);
    }

    console.log('Starting export process...');
    const page = await browser.newPage();

    await page.goto('http://localhost:3000/team-review', {
      waitUntil: 'networkidle2',
    });

    await page.waitForSelector('svg');
    console.log('Page loaded successfully');

    for (let endWeek = 1; endWeek <= 14; endWeek++) {
      const weekRange = `1-${endWeek + 1}`;
      console.log(`Processing week range ${weekRange}...`);

      await page.evaluate(
        (startWeek, endWeek) => {
          const rangeSliderElement = document.querySelector(
            '.mantine-RangeSlider-root'
          );
          if (rangeSliderElement && window.setSelectedWeekRange) {
            window.setSelectedWeekRange([startWeek - 1, endWeek - 1]);
          }
        },
        1,
        endWeek + 1
      );

      await page.waitForTimeout(1000);

      const svgElement = await page.$('svg');
      if (svgElement) {
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

exportPRDiagrams().catch(console.error);
