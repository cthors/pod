// note: if a podcast is repeated in the opml file(s), its specific episodes will not be recognized as same episode, who knows what else will happen
// note: opml files are assumed to consist of podcast entries within category entries, both <outline> elements
// note: can add multiple opml files one by one. todo: allow them to be added at the same time?

// q: how does it help w program structure to use "this" to run functions from one class on an object of another class? Have I used that at all?

// todo: bug: if entries.list.urls[1] doesnt exist, podcast isnt displayed
// todo: bug: need to set size of list areas manually b/c they don't stretch automatically - maybe just set the heights when page is resized
// todo: bug: if you click away and click back again on category while it's loading, the "earlier" btn will sometimes be enabled (hard to reproduce)
// todo: cache the opml file? (so browser back button allows going back to the last setup)

import * as components from "./components.js"
import * as model from "./model.js"
import * as config from "./config.js"

//button id's for distinguishing the source of a click
const EARLIER     = "btnEarlier"
const LATER       = "btnLater"
export const NOW  = "btnNow"

//class names for distinquishing the class of an object
const PODCASTROW = "PodcastRow"
const CATEGORYROW = "CategoryRow"

customElements.define('category-row', components.CategoryRow)
customElements.define('podcast-row', components.PodcastRow)
customElements.define('episode-row', components.EpisodeRow)
customElements.define('download-row', components.DownloadRow)
customElements.define('podcast-info', components.PodcastInfo)
customElements.define('episode-info', components.EpisodeInfo)

//event listeners
document.getElementById('btnLoadFile').addEventListener('change', (e) => loadOpml(e))
document.getElementById('btnLoadAll').addEventListener('mousedown', () => loadAllPodcasts())
document.getElementById('btnClearDl').addEventListener('mousedown', () => ourModel.clearDlList())
for (const btn of document.getElementById('timeBtns').children){
  btn.addEventListener('mousedown', (e) => goEarlierLater(e.target.id))
}
document.getElementById('btnUnselAll').addEventListener('mousedown', () => noneToDl())
document.getElementById('btnSelectAll').addEventListener('mousedown', () => allToDl())
document.getElementById('btnGetHtml').addEventListener('mousedown', () => genHtmlfile())
document.getElementById('btnGetJSON').addEventListener('mousedown', () => genJSONfile())

// export the model so all elements can access it
export const ourModel = new model.Model(
  document.getElementById('podcastListArea'),
  document.getElementById('episodeListArea'),
  document.getElementById('downloadListArea'),
  document.getElementById('podcastDescArea').firstElementChild,
  document.getElementById('episodeDescArea').firstElementChild)

//-------------------------------------------------------------------------------------------------

function loadOpml(e){
  document.getElementById('btnLoadAll').disabled = false
  components.removeClass(document.getElementById('btnLoadAll'), components.DISABLED)
	const reader = new FileReader();
	reader.onerror = () => console.log('File Error! Code ' + e.target.error.code)
  reader.onload = () => {
    const opml = reader.result
    const filename = e.target.files[0].name
    modelToUi(opmlToModel(opml, filename))
  }
  reader.readAsText(e.target.files[0])
}

function opmlToModel(opml, filename){
  const parser = new DOMParser()
  const xmlDoc = parser.parseFromString(opml,'text/xml')
  const bodyElem = xmlDoc.querySelector('body')
  const opmlFileObj = new model.OpmlFile(filename)

  bodyElem.querySelectorAll(':scope>outline').forEach((catElem) => { // :scope> limits selector to direct children
    const catObj = new components.CategoryRow(catElem.attributes['text'].value)
    catElem.querySelectorAll('outline').forEach((podElem) => {
      const podObj = new components.PodcastRow(podElem.attributes['text'].value, podElem.attributes['xmlUrl'].value)
      //add a method to get the podcast's category (parent)
      podObj.getCategory = function(){ return catObj }
      catObj.podcasts.push(podObj)
    })
    opmlFileObj.categories.push(catObj)
  })
  const opmlFileObjId = ourModel.addOpmlFile(opmlFileObj)
  return opmlFileObjId
}

function modelToUi(opmlFileId){
  ourModel.traverseCatToPod(opmlFileId,
    (catRow) => { ourModel.podcastListArea.appendChild(catRow) },
    (podRow) => { ourModel.podcastListArea.appendChild(podRow) }
  )
}

//-------------------------------------------------------------------------------------------------

function loadAllPodcasts(){
  document.getElementById('btnLoadAll').disabled = true
  components.addClass(document.getElementById('btnLoadAll'), components.DISABLED)
  // todo: right now, podcasts aren't added to categories on the fly during load-all
  ourModel.traverseCatToPodAll(
    () => {},
    (podRow) => { 
      if (!podRow.classList.contains(podRow.loaded) && !podRow.requestSent) {
        podRow.loadFeed(podRow.afterLoadNotSel) // had to change afterLoadNotSel to arrow function for "this" to refer to podRow
      }
    }
  )
}

//-------------------------------------------------------------------------------------------------

export function enableDisableTimeBtns(moreEps){
  document.getElementById('btnEarlier').disabled = !moreEps[0]
  document.getElementById('btnLater').disabled = !moreEps[1]
  document.getElementById('btnNow').disabled = !moreEps[1]
}

// called by PodcastRow, CategoryRow - each needs to have display() which needs to return [earlierExists, laterExists]
export function goEarlierLater(btnId){
  const dataObj = ourModel.lastSelectedPod
  //update bookmark
  switch(btnId){
  case EARLIER:
    dataObj.bookmark = dataObj.bookmarkEarlierF(dataObj.bookmark)
  break
  case LATER:
    dataObj.bookmark = dataObj.bookmarkLaterF(dataObj.bookmark)
  break 
  case NOW:
    dataObj.bookmark = 0
  break
  }
  ourModel.clearEpList()
  enableDisableTimeBtns(ourModel.lastSelectedPod.display())
}

//-------------------------------------------------------------------------------------------------

function noneToDl(){ 
  for (const epRow of ourModel.episodeListArea.children){
    epRow.querySelector(components.CHECKBOX).checked = false
    ourModel.removeDownloadRow(epRow.downloadRow)
  }
}

function allToDl(){
  for (const epRow of ourModel.episodeListArea.children){
    epRow.querySelector(components.CHECKBOX).checked = true
    ourModel.displayDownloadRow(epRow.downloadRow)
  }
}

//-------------------------------------------------------------------------------------------------

//todo: combine these 2 functions?
function genHtmlfile(){

    let fileContent = "<html><body>";

    for (const dlRow of ourModel.downloadListArea.children){
      fileContent = fileContent + `<a href="${dlRow.episodeUrl}">${dlRow.title} - ${dlRow.podTitle}</a><br />`
    }

    fileContent = fileContent + "</body></html>";
    const element = document.createElement('a');
    element.setAttribute('href', 'data:text/html;charset=utf-8,' + encodeURIComponent(fileContent));
    element.setAttribute('download', 'episodes.html');
    element.style.display = 'none';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
}

function genJSONfile(){

    let fileContent = "";

    for (const dlRow of ourModel.downloadListArea.children){
      fileContent = fileContent + JSON.stringify({'url':dlRow.audioUrl, 'title':dlRow.title, 'podTitle':dlRow.podTitle}) + '\n';
    }

    const element = document.createElement('a');
    element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(fileContent));
    element.setAttribute('download', 'episodes.json');
    element.style.display = 'none';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
}