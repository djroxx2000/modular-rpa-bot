// Event Handlers

const handleInput = (e) => {
  let eventObject = e.target.eventObject;
  if (e.target.value !== '') {
    eventObject.eventType = 'form';
    eventObject.inputValue = e.target.value;
    e.target.removeEventListener('focusout', handleInput);
    window.userAction(eventObject);
  }
  e.target.eventObject = null;
}

const handleSelect = (e) => {
  let eventObject = e.target.eventObject;
  // TODO: Handle select tags
  e.target.removeEventListener('focusout', handleInput);
  e.target.eventObject = null;
}

const handleFormClick = (eventObject, e) => {
  e.target.eventObject = eventObject;
  if (e.target.tagName == 'INPUT') {
    e.target.addEventListener('focusout', handleInput);
    return;
  }
  if (e.target.tagName == 'SELECT') {
    e.target.addEventListener('focusout', handleSelect);
    return;
  }
  return eventObject;
}

// Event Data Collection Utilities

const createEventObject = async (event, type) => {
  eventObject = {};
  eventObject.eventType = type;
  eventObject.location = window.location.href;
  eventObject.selector = getSelector(event.target);
  for (let prop in event) {
    if (["number","string","boolean"].indexOf(typeof event[prop]) > -1 && 
        ["AT_TARGET",
        "BUBBLING_PHASE",
        "CAPTURING_PHASE",
        "NONE",
        "DOM_KEY_LOCATION_STANDARD",
        "DOM_KEY_LOCATION_LEFT",
        "DOM_KEY_LOCATION_RIGHT",
        "DOM_KEY_LOCATION_NUMPAD"].indexOf(prop) == -1) {
      eventObject[prop] = event[prop];
	  }
  }
  
  let path = getPathFromRoot(event.target);
  eventObject.targetElement = {};
  eventObject.targetElement.uid = path;
  eventObject.targetElement.classes = event.target.getAttribute('class');
  eventObject.targetElement.ids = event.target.getAttribute('id');
  eventObject.targetElement.tag = event.target.tagName;
  switch (type) {
    case 'click':
      eventObject = addPointerEventFields(eventObject, event);
      eventObject = handleFormClick(eventObject, event);
      if (eventObject == null) {
        return;
      }
      break;
    case 'contextmenu':
      eventObject = addPointerEventFields(eventObject, event);
      break;
    case 'copy':
      eventObject = await addClipboardEventFields(eventObject);
      break;
  }
  console.log(eventObject);
  return eventObject;
}

const getPathFromRoot = (node) => {
  let path = "$";
  while(node) {
    let parent = node.parentElement;
    if (!parent) {
      path = "HTML.0.0#" + path;
      break;
    }
    let eleIdx = -1, absIdx = -1;
    for(let i = 0; i < parent.children.length; i++)
    {
      if (parent.children[i].tagName == node.tagName) {
        eleIdx++;
      }
      if(parent.children[i] == node) {
        absIdx = i;
        break;
      }
    }
    let tagName = node.tagName || "UNKNOWN";
    path = tagName + "." + eleIdx + '.' + absIdx + "#" + path;
    node = node.parentElement;
  }
  return path;
}

const addPointerEventFields = (pointerObj, event) => {
  pointerObj.coordinates = [event.clientX, event.clientY];
  return pointerObj;
}

const addClipboardEventFields = async (clipboardObj) => {
  return new Promise(async (resolve) => {
    let data = await navigator.clipboard.readText();
    resolve(data);
  }).then((textData) => {
    clipboardObj.clipboardData = textData;
    return clipboardObj;
  });
}

const evalFunctions = {
  createEventObject: createEventObject.toString(),
  addPointerEventFields: addPointerEventFields.toString(),
  addClipboardEventFields: addClipboardEventFields.toString(),
  handleFormClick: handleFormClick.toString(),
  handleInput: handleInput.toString(),
  handleSelect: handleSelect.toString(),
  getPathFromRoot: getPathFromRoot.toString()
}

module.exports = {
  evalFunctions
};