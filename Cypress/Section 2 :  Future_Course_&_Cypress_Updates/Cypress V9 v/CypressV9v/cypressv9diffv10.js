// Cypress V9  v/s V10 onwards

// V9 whne you run open cypress you do not get e2e testing and component testing option.
// But you will get e2e testing and component testing option.
// There are UI changes 
// TestRunner from V9 is revamped and is called cypress app now.
// In V9 tests were in intergration folder. In V10 e2e
// In V9 there was plugins folder wihich had index file used to add plugins which cypress does not support.
// In V10 we have e2e file under support folder.
// In V9 and older there was cyress.json file in root folder which was used to store specific/global settings.
// In V10 we have cypress.config.js for global settings like pageloadwait,baseurl,where to store screenshots and videos.