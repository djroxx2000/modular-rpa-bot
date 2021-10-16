// Event Handlers

const handleInput = (e, eventObject) => {
  console.log('handling input');
  if (e.target.value !== '') {
    eventObject.isForm = true;
    eventObject.inputValue = e.target.value;
    // e.target.removeAllListeners('focusout');
    window.documentClick(eventObject);
  }
}

const handleSelect = (e, eventObject) => {
  // TODO: Handle select tags
  e.target.removeAllListeners('focusout');
}

const handleFormClick = (eventObject, event, type) => {
  if (type !== 'click') {
    return eventObject;
  }
  if (event.target.tagName == 'INPUT') {
    console.log('input');
    event.target.addEventListener('focusout', (e) => {
      console.log('focusout');
      handleInput(e, eventObject);
    });
    return;
  }
  if (event.target.tagName == 'select') {
    event.target.addEventListener('focusout', (e) => {
      handleSelect(e, eventObject);
    });
    return;
  }
  return eventObject;
}

// Event Data Collection Utilities

const createEventObject = async (event, type) => {
  eventObject = {};
  eventObject.eventType = type;
  eventObject.location = window.location.href;

  let path = getPathFromRoot(event.target);
  eventObject.targetElement = {};
  eventObject.targetElement.uid = path;
  eventObject.targetElement.classes = event.target.getAttribute('class');
  eventObject.targetElement.ids = event.target.getAttribute('id');
  eventObject.targetElement.tag = event.target.tagName;
  switch (type) {
    case 'click':
      eventObject = addPointerEventFields(eventObject, event);
      eventObject = handleFormClick(eventObject, event, type);
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
  return eventObject;
}

const getPathFromRoot = (node) => {
  let path = "$";
  while(node) {
    let parent = node.parentElement;
    if (!parent) {
      path = "HTML.0#" + path;
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