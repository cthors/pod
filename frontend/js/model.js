import * as config from "./config.js"

export class OpmlFile {
	id				// unique id - generated
	filename
	categories		// array of CategoryRows - added in app.opmlToModel()

	constructor(filename){
		this.filename = filename
		this.id = Math.random().toString(16).slice(2) 
		this.categories = []
	}
}

export class Model {

	podcastListArea		// <div> PodcastRows are added to
	episodeListArea		// <div> EpisodeRows are added to
	downloadListArea 	// <div> EpisodeRows are added to
	podcastInfo 		// PodcastInfo element
	episodeInfo			// EpisodeInfo element
	modelTree 			// dictionary of OpmlFile objects indexed by id. OpmlFile -> CategoryRow -> PodcastRow -> Episode

	lastSelectedEp		// so we don't have to go thru them all to uncheck
	lastSelectedPod		// // so we can re-select the podcast after it gets changed by downLoadList mouseover

	constructor(podcastListArea, episodeListArea, downloadListArea, podcastInfo, episodeInfo){
		this.podcastListArea = podcastListArea
		this.episodeListArea = episodeListArea
		this.downloadListArea = downloadListArea
		this.podcastInfo = podcastInfo
		this.episodeInfo = episodeInfo
		this.modelTree = {}
		this.lastSelectedEp = null // first selection will still cause an error
		this.lastSelectedPod = null
		this.downloadListArea.addEventListener('mouseleave', () => {this.displayPodInfo(this.lastSelectedPod)})
	}

	// takes an OpmlFile object, adds it to the tree and returns its unique id for referencing
	addOpmlFile(opmlFileObj){
		this.modelTree[opmlFileObj.id] = opmlFileObj
		return opmlFileObj.id
	}

	//--- display infos-----------------------------------------------------------------------

	// called by CategoryRow and PodcastRow
	displayPodInfoSpringback(dataObj){ // dataObj is either CategoryRow or PodcastRow
		this.lastSelectedPod = dataObj
		this.displayPodInfo(dataObj)
	}

	// called by DownloadRow and downloadListArea mouseleave (in here)
	displayPodInfo(dataObj){
		this.podcastInfo.currDataObj = dataObj
		this.podcastInfo.updateHtml()
	}

	displayEpInfo(dataObj){
		this.episodeInfo.currDataObj = dataObj
		this.episodeInfo.updateHtml()
	}

	//--- display rows------------------------------------------------------------------------

	// called by CategoryRow
	displayEpisodeRow(dataObj, i){ // adds an EpisodeRow to the page
		if (dataObj.episodeRows[i]){ // if the EpisodeRow exists
			this.episodeListArea.appendChild(dataObj.episodeRows[i])
		}
	}

	// called by PodcastRow
	displayEpisodeRows(dataObj){ //adds multiple EpisodeRows to the page
		const lastIndexToLoad = dataObj.bookmarkEarlierF(dataObj.bookmark)
		for(var i = dataObj.bookmark; i<lastIndexToLoad; i++){
			if (dataObj.episodeRows[i]){ // if the EpisodeRow exists
				this.episodeListArea.appendChild(dataObj.episodeRows[i])
			}
		}
	}

	// called by EpisodeRow
	displayDownloadRow = (dataObj) => this.downloadListArea.appendChild(dataObj)

	//--- clear rows-------------------------------------------------------------------------

	// called by CategoryRow and PodcastRow
	clearEpList(){this.episodeListArea.innerHTML = ""}

	// called by app
	clearDlList(){
		for (const dlRow of this.downloadListArea.querySelectorAll('download-row')){
			dlRow.removeEpisodeCheck()
		}
		this.downloadListArea.innerHTML = ""
	}

	// called by EpisodeRow
	removeDownloadRow = (dataObj) => this.downloadListArea.removeChild(dataObj)

	//--- specific tree traversal functions ------------------------------------------------
	// todo: could make this even more general

	// called by CategoryRow and PodcastRow
	clearSelectedCatPod(){ // clears the last selected category or podcast
		this.traverseCatToPodAll(
			(catRow) => {catRow.classList.remove(catRow.selected)},
			(podRow) => {podRow.classList.remove(podRow.selected)}
		)
	}

	//--- general tree traversal functions -------------------------------------------------

	// goes thru the tree and runs the supplied function on each category or podcast
	traverseCatToPodAll(catFunc, podFunc){
		for (const [id, opmlFile] of Object.entries(this.modelTree)) {
			this.catToPodByOpml(opmlFile, catFunc, podFunc)
		}
	}

	traverseCatToPod(opmlFileId, catFunc, podFunc) {
		this.catToPodByOpml(this.modelTree[opmlFileId], catFunc, podFunc)
	}

	catToPodByOpml(opmlFile, catFunc, podFunc) {
		for (const category of opmlFile.categories) {
			catFunc(category)
			for (const podcast of category.podcasts) {
				podFunc(podcast)
			}
		}
	}
}