const readline = require('readline');

const askQuestion = (query) => {
	const rl = readline.createInterface({
		input: process.stdin,
		output: process.stdout,
	});

	return new Promise((resolve) =>
		rl.question(query, (ans) => {
			rl.close();
			resolve(ans);
		})
	);
};

const parseLogs = async (eventLog) => {
  let eventList = eventLog.eventList;
  let currIndex = 0;
  let scriptModules = [];
  while(true) {
    if (currIndex >= eventList.length) {
      break;
    }
    let endIndex = parseInt(await askQuestion(`Module ${scriptModules.length + 1} end index starting from index ${currIndex}: `));
    currIndex = endIndex + 1;
    let isRepeat = await askQuestion(`Does module ${scriptModules.length + 1} repeat? \n0. No \n1. Exact action repeat \n2. Neighboring element repeat \n`);
    let repeatTimes = 1;
    if (isRepeat == '1') {
      repeatTimes = parseInt(await askQuestion(`Number of times to repeat module: `));
    }
    let moduleLabel = null;
    if (isRepeat) {
      moduleLabel = await askQuestion(`Module label (repeat modules use same label): `);
    }
    scriptModules.push({
      start: currIndex,
      end: endIndex,
      isRepeat: isRepeat,
      label: moduleLabel,
    });
  }
  console.log(scriptModules);
  // Call script creation logic
  createScript(scriptModules, eventList, eventLog.reqList);
}

const createScript = async (scriptModules, eventList, reqList) => {
  let finalScript = '';
  for (let module of scriptModules) {
    let moduleScript = '';
    if (module.isRepeat == '0') {
      for (let i = module.start; i <= module.end; i++) {
        moduleScript += getEventCode(eventList[i]);
      }
    } else {
    }
  }
}

const getEventCode = (eventObj) => {
  switch (eventObj.eventType) {
    case 'form': 
      if (eventObj.tagName == 'INPUT') {

      }
      break;
    case 'click': break;
    case 'contextmenu': break;
    case 'copy': break;
  }
}

module.exports = {
  parseLogs
}