// // script to automate exporting PR diagrams
// const puppeteer = require('puppeteer');
// const fs = require('fs');
// const path = require('path');
// const readline = require('readline');
// const { program } = require('commander');

// // CLI configuration
// program
//   .name('export-diagrams')
//   .description('Export PR diagrams as PNG files for multiple week ranges')
//   .version('1.0.0')
//   .option('-u, --url <url>', 'URL of your application', 'http://localhost:3000')
//   .option('-p, --path <path>', 'Path to the team review page', '/team-review')
//   .option(
//     '-o, --output <directory>',
//     'Output directory for PNG files',
//     './pr-exports'
//   )
//   .option(
//     '-t, --type <type>',
//     'Diagram type to export (arc, network, all)',
//     'all'
//   )
//   .option('-d, --delay <ms>', 'Delay between actions in ms', '2000')
//   .option('-w, --width <pixels>', 'Viewport width', '1200')
//   .option('-h, --height <pixels>', 'Viewport height', '900')
//   .option(
//     '-s, --selector <selector>',
//     'Custom selector for the diagram SVG',
//     ''
//   )
//   .option('-i, --interactive', 'Run in interactive mode with prompts', false)
//   .parse();

// const options = program.opts();

// const DIAGRAM_TYPES = {
//   ARC: 'arc',
//   NETWORK: 'network',
// };

// const SVG_SELECTORS = {
//   [DIAGRAM_TYPES.ARC]: '.arc-diagram svg, [data-testid="arc-diagram"] svg, svg',
//   [DIAGRAM_TYPES.NETWORK]:
//     '.network-diagram svg, [data-testid="network-diagram"] svg, svg',
// };

// function createPrompt() {
//   return readline.createInterface({
//     input: process.stdin,
//     output: process.stdout,
//   });
// }

// async function prompt(question, defaultAnswer = '') {
//   const rl = createPrompt();
//   return new Promise(resolve => {
//     rl.question(
//       `${question} ${defaultAnswer ? `(default: ${defaultAnswer})` : ''}: `,
//       answer => {
//         rl.close();
//         resolve(answer || defaultAnswer);
//       }
//     );
//   });
// }

// async function exportDiagrams() {
//   let config = { ...options };

//   if (options.interactive) {
//     console.log('💻 PR Diagram Export Tool - Interactive Mode 💻');
//     console.log('----------------------------------------------');

//     config.url = await prompt('Enter your app URL', config.url);
//     config.path = await prompt('Enter the page path', config.path);
//     config.output = await prompt('Enter output directory', config.output);
//     config.type = await prompt(
//       'Enter diagram type to export (arc, network, all)',
//       config.type
//     );
//     config.delay = await prompt(
//       'Enter delay between actions in ms',
//       config.delay
//     );

//     const customSelector = await prompt(
//       'Enter custom SVG selector (leave empty for default)',
//       ''
//     );
//     if (customSelector) {
//       config.selector = customSelector;
//     }
//   }

//   config.delay = parseInt(config.delay, 10);
//   config.width = parseInt(config.width, 10);
//   config.height = parseInt(config.height, 10);

//   if (!fs.existsSync(config.output)) {
//     fs.mkdirSync(config.output, { recursive: true });
//     console.log(`Created output directory: ${config.output}`);
//   }

//   const typesToExport =
//     config.type === 'all'
//       ? [DIAGRAM_TYPES.ARC, DIAGRAM_TYPES.NETWORK]
//       : [config.type];

//   console.log('\n📊 Export Configuration:');
//   console.log(`URL: ${config.url}${config.path}`);
//   console.log(`Output Directory: ${config.output}`);
//   console.log(`Diagram Types: ${typesToExport.join(', ')}`);
//   console.log(`Delay: ${config.delay}ms`);
//   console.log('----------------------------------------------\n');

//   // Launch browser
//   console.log('Launching browser...');
//   const browser = await puppeteer.launch({
//     headless: 'new',
//     defaultViewport: {
//       width: config.width,
//       height: config.height,
//     },
//   });

//   try {
//     const page = await browser.newPage();

//     const fullUrl = `${config.url}${config.path}`;
//     console.log(`Navigating to ${fullUrl}...`);

//     await page.goto(fullUrl, {
//       waitUntil: 'networkidle2',
//       timeout: 60000,
//     });

//     console.log('Waiting for page to fully load...');
//     await page.waitForSelector('svg', { timeout: 30000 });

//     const weekRanges = [];
//     for (let endWeek = 1; endWeek <= 14; endWeek++) {
//       weekRanges.push([0, endWeek]);
//     }

//     console.log(
//       `\nStarting export of ${weekRanges.length} week ranges for ${typesToExport.length} diagram types...`
//     );

//     for (const type of typesToExport) {
//       console.log(`\n🔄 Processing ${type.toUpperCase()} diagrams...`);

//       let svgSelector = config.selector || SVG_SELECTORS[type];

//       for (let i = 0; i < weekRanges.length; i++) {
//         const range = weekRanges[i];
//         const rangeLabel = `Week ${range[0] + 1}-${range[1] + 1}`;
//         console.log(`  Processing ${rangeLabel}...`);

//         await page.evaluate(range => {
//           if (window.setSelectedWeekRange) {
//             window.setSelectedWeekRange(range);
//             return;
//           }

//           const rangeSlider = document.querySelector(
//             '.mantine-RangeSlider-root'
//           );
//           if (rangeSlider && rangeSlider.__reactProps$) {
//             const props = Object.entries(rangeSlider).find(([key]) =>
//               key.startsWith('__reactProps$')
//             );
//             if (props && props[1].onChange) {
//               props[1].onChange(range);
//               return;
//             }
//           }

//           document.dispatchEvent(
//             new CustomEvent('setWeekRange', {
//               detail: { range },
//             })
//           );

//           const sliderTrack = document.querySelector(
//             '.mantine-RangeSlider-track'
//           );
//           if (sliderTrack) {
//             const maxWeeks = 15;
//             const startPct = (range[0] / (maxWeeks - 1)) * 100;
//             const endPct = (range[1] / (maxWeeks - 1)) * 100;

//             console.log(`Setting slider to ${startPct}% - ${endPct}%`);
//           }

//           console.log(`Set week range to [${range[0]}, ${range[1]}]`);
//         }, range);

//         console.log(`  Waiting ${config.delay}ms for diagram to update...`);
//         await page.waitForTimeout(config.delay);

//         const svgElement = await page.$(svgSelector);
//         if (svgElement) {
//           const filename = path.join(
//             config.output,
//             `${type}_diagram_week_${range[0] + 1}_to_${range[1] + 1}.png`
//           );

//           await svgElement.screenshot({
//             path: filename,
//             omitBackground: false,
//             type: 'png',
//           });

//           console.log(`  ✅ Saved to: ${filename}`);
//         } else {
//           console.error(
//             `  ❌ SVG element not found using selector: ${svgSelector}`
//           );

//           const allSvgs = await page.$$('svg');
//           console.log(`  Found ${allSvgs.length} SVG elements on the page`);

//           if (allSvgs.length > 0) {
//             console.log('  Try one of these selectors:');
//             await page.evaluate(() => {
//               const svgs = document.querySelectorAll('svg');
//               svgs.forEach((svg, i) => {
//                 let parent = svg.parentElement;
//                 let parentSelector = '';

//                 for (let j = 0; j < 3 && parent; j++) {
//                   if (parent.id) {
//                     parentSelector = `#${parent.id} > ${parentSelector}`;
//                     break;
//                   } else if (parent.className) {
//                     parentSelector = `.${parent.className.split(' ')[0]} > ${parentSelector}`;
//                     break;
//                   }
//                   parent = parent.parentElement;
//                 }

//                 console.log(`    SVG #${i + 1}: ${parentSelector}svg`);
//               });
//             });
//           }
//         }
//       }
//     }

//     console.log('\n🎉 Export complete!');
//   } catch (error) {
//     console.error('Error during export:', error);
//   } finally {
//     await browser.close();
//   }
// }

// exportDiagrams().catch(console.error);
