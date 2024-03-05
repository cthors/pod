import * as config from "./config.js"
import * as templates from "./templates.js"
import * as requests from "./requests.js"
import * as app from "./app.js" // to access the model

// html node names for distinguishing the source of a click
const BUTTON = "BUTTON"
export const CHECKBOX = "INPUT" //used in app
const LINK = "A"

// for row objects: string literals for property names which correspond with css classes of the same names
const SELECTED = "selected"
export const DISABLED = "disabled"
const LOADED = "loaded"
const HOVER = "hover"

export function addClass(element, cssClass){
	element.classList.add(element[cssClass])
}

export function removeClass(element, cssClass){
	element.classList.remove(element[cssClass])
}

function isOfClass(element, cssClass){
	return element.classList.contains(element[cssClass])
}

function flipHidden(element){
	element.hidden = !element.hidden
}

//--- UI superclass -----------------------------------------------------

class Component extends HTMLElement {
	templateFunc

	constructor(templateFunc){
		super()
		this.templateFunc = templateFunc
	}

	updateHtml(){
		this.innerHTML = this.templateFunc.bind(this)()
	}
}

//--- dynamically-created UI components ---------------------------------

// gets created in app.js
export class CategoryRow extends Component {

	// properties required to display in PodcastInfo
	title 			// property from OPML
	subtitle		// placeholder
	summary			// placeholder
	////
	podcasts		// array of PodcastRows - added in app.js
	bookmark		// saves view index for episodes - like 0 1 2 3 4
	bookmarkEarlierF = (bookmark) => bookmark + 1 // increment the bookmark (no brackets = implicit return)
	bookmarkLaterF = (bookmark) => bookmark - 1 // decrement the bookmark
	largestIndex	// the largest episode index of the podcasts

	constructor(titleIn){
		super(templates.categoryRow)
		this.title = titleIn
		this.subtitle = " "
		this.summary = " "
		this.podcasts = []
		////
		this.bookmark = 0
		this.largestIndex = 0
		this.loadedCount = 0
		////
		this[SELECTED] = SELECTED // css classes
		////
		this.firstClickHandler = this.generateClickHandler(this.firstClickInner) //	a ref to the event handler function (so it can be removed later)
		this.nextClickHandler = this.generateClickHandler(this.restClickInner) // (they are also accessed by PodcastRow)
		this.addEventListener('mousedown', this.firstClickHandler)
		////
		this.updateHtml()
	}

	// given an inner function, returns a function that is either the handler for the clicks before category loading, or a handler for all subsequent clicks
	generateClickHandler(innerF){
		return function(e){
			switch(e.target.nodeName){ //the event will bubble up from its children
	            case BUTTON :
	            	for (const podRow of this.podcasts){
	            		flipHidden(podRow)
	            	}
	            break
	            default :
	            	app.ourModel.clearSelectedCatPod()	// unstyle last selected row
	            	addClass(this, SELECTED)			// style this row as selected
	            	app.ourModel.clearEpList()			// clear episodes from the page
	            	app.ourModel.displayPodInfoSpringback(this) //display category info, set it as last selected
					innerF(e.currentTarget) // SWAPPABLE PART (e.currentTarget because "this" doesn't work inside here)
	            break
	        }
		}
	}

	//for when everything is loaded: just display the episodes
	restClickInner(me){
		//put the episodes on the page at the current bookmark
		app.enableDisableTimeBtns(me.display())
	}

	//for when things are not yet loaded: wait for requests to return, make requests, and wait for those requests to return
	firstClickInner(me){ // replaced all the "this" with "me" (b/c function is generated - no "this")
		document.getElementById('btnEarlier').disabled = true	
		document.getElementById('btnLater').disabled = true
		document.getElementById('btnNow').disabled = true

		for (const podRow of me.podcasts){

			if (!isOfClass(podRow, LOADED)){	// if podcast is not already loaded
				if(!podRow.requestSent){ 		// if request (by PodcastRow) isn't already in progress
					podRow.loadFeed(() => {		// upon request's return:
						if(isOfClass(me, SELECTED)){ // if i'm still selected (could have clicked away while loading) 
			    			me.displayOne(podRow) //add it to the display + update the properties
					    }
					    else{
					    	me.updateCategoryRow(podRow) //just update the properties
					    }
					    //START SAME-ISH STUFF
					    if(me.loadedCount == me.podcasts.length){ // all podcasts in the category have been loaded
					    	me.removeEventListener('mousedown', me.firstClickHandler) // switch from this event handler to the non-loading/non-waiting one
							me.addEventListener('mousedown', me.nextClickHandler)
							if((me.largestIndex > 0) && isOfClass(me, SELECTED)){ //if im selected + there are any ealier podcasts
								console.log("me.loadedCount" + me.loadedCount)
								document.getElementById('btnEarlier').disabled = false
							}
						}
						//END
					})
				}
				else{} //request has been sent but not come back yet (don't do anything in here - handled in PodcastRow)
			}
			else { // for podcasts that are already loaded (from having been clicked on individually) - mostly same as above
				me.displayOne(podRow) //add it to the display + update the properties
				//START SAME-ISH STUFF
				if(me.loadedCount == me.podcasts.length){ // all podcasts in the category have been loaded
					me.removeEventListener('mousedown', me.firstClickHandler) // switch from this event handler to the non-loading/non-waiting one
					me.addEventListener('mousedown', me.nextClickHandler)
					if (me.largestIndex > 0){ // if there are earlier podcasts (not async so just clicked here = this is selected)
						console.log("me.already.loadedCount" + me.loadedCount)
						document.getElementById('btnEarlier').disabled = false
					}
				}
				//END
			} 
	    }
	}

	//called by app.js and here
	display(){
		for (const podRow of this.podcasts){
			this.displayOne(podRow)
		}
		var earlierExists = false
		var laterExists = false
		if(this.bookmark > 0){
			laterExists = true
		}
		if(this.bookmark<this.largestIndex){
			earlierExists = true
		}
		return [earlierExists, laterExists]
	}

	updateCategoryRow(podRowLoaded){
		if(podRowLoaded.savedFeed.entries.length > this.largestIndex){
			this.largestIndex = podRowLoaded.savedFeed.entries.length-1
		}
		this.loadedCount++
	}

	//displays one episode from a podcast (used directly in handleFirstClick() and used in display())
	//and updates some properties of CategoryRow
	displayOne(podRow){
		podRow.createEpisode(this.bookmark) //if neccessary
		app.ourModel.displayEpisodeRow(podRow, this.bookmark)
		this.updateCategoryRow(podRow)
	}
}

// gets created in app.js
export class PodcastRow extends Component {

	// properties from OPML, set in constructor
	opmlTitle		
	feedUrl
	// properties from feed, required to display in PodcastInfo	
	title
	subtitle 		// a shorter summary - may or may not exist
	summary 		// a longer summary - may or may not exist
	thumbnailUrl
	podcastUrl
	author 			//TODO feed.author
	savedFeed		// entire feed

	labelField		// points to which title (opmlTitle or title) to use
	episodeRows		// array of EpisodeRows
	bookmark		// saves view index for episodes - like 0 10 20 30 40
	requestSent		// keeps track of if a web request has gone out or not for this podcast
	bookmarkEarlierF = (bookmark) => bookmark + config.EPS_PER_PAGE // no brackets = implicit return
	bookmarkLaterF = (bookmark) => bookmark - config.EPS_PER_PAGE

	constructor(titleIn, feedUrlIn){
		super(templates.podcastRow)
		this.opmlTitle = titleIn
		this.feedUrl = feedUrlIn
		this.savedFeed = ""
		this.labelField = this.opmlTitle
		this.episodeRows = []
		this.bookmark = 0
		this.requestSent = false
		this[SELECTED] = SELECTED // css classes
		this[LOADED] = LOADED
		this[DISABLED] = DISABLED
		this.updateHtml()
		this.addEventListener('mousedown', this.handleClick)
	}

	//function holding the things to do when a pod feed is loaded if that row isn't currently selected
	afterLoadNotSel = (dontneed) => { //dontneed because it needs to fit the shape of the callback of PodcastRow.loadFeed
		const myCat = this.getCategory()
		if( isOfClass(myCat, SELECTED) ) { // corresponding category is selected
			myCat.displayOne(this)
			//do all this stuff that's usually done in CategoryRow:
			if(myCat.loadedCount == myCat.podcasts.length){ // all podcasts in the category have been loaded
			    myCat.removeEventListener('mousedown', myCat.firstClickHandler) // switch from this event handler to the non-loading/non-waiting one
				myCat.addEventListener('mousedown', myCat.nextClickHandler)
				//enable "earlier" if earlier episodes exist
				if (myCat.largestIndex > 0){
					console.log("myCat.loadedCount" + myCat.loadedCount) 
					document.getElementById('btnEarlier').disabled = false
				}
			}
		}
	}

	handleClick(){
		app.ourModel.clearSelectedCatPod()	// unstyle last selected row
		addClass(this, SELECTED)			// style this row as selected
		app.ourModel.clearEpList()			// clear episodes from the page

		if (!isOfClass(this, LOADED)){ // load: do web request, if request isn't in progress (by CategoryRow)
			this.loadFeed(() => {
				if(isOfClass(this, SELECTED)){ //if podcast's still selected after the server response, display it
					app.ourModel.displayPodInfoSpringback(this)
					app.goEarlierLater(app.NOW)
				}
				else{
					this.afterLoadNotSel()
				}
			})
		} 
		else { // podcast data is already loaded
			app.ourModel.displayPodInfoSpringback(this)
			app.enableDisableTimeBtns(this.display())
		}
	}

//---functions for loading--------------------------------------------------------

	loadFeed(callback){
		this.requestSent = true
		console.log(`starting ${this.opmlTitle} podcast request`)
		addClass(this, DISABLED) //disable this row
	 	const reqObj = requests.pod(this.feedUrl) 
	 	fetch(reqObj)
	 		.then(response => response.json())
	 		.then(data => {
	 			this.setPodInfo(
                    data.feed.title,
                    data.feed.subtitle,
                    data.feed.summary,
                    data.feed.author,
                    data.feed.image.href,
                    data.feed.link,
                    data)
		      	console.log(`finished ${this.opmlTitle} podcast request:`)
		      	console.log(data)
		      	removeClass(this, DISABLED) //re-enable this row & set it as loaded
		      	addClass(this, LOADED)
		      	callback(data)
		    })
    		//.catch(err => {console.log(`error loading podcast ${this.opmlTitle}: ${err}`)})
	}

	setPodInfo(title, subtitle, summary, author, thumbnailUrl, podcastUrl, savedFeed){
		this.title = title
		this.subtitle = subtitle
		this.summary = summary
		this.author = author
		this.thumbnailUrl = thumbnailUrl
		this.podcastUrl = podcastUrl
		this.savedFeed = savedFeed
		this.labelField = this.title //set the displayed title to the title from the server
		this.updateHtml()
	}

//---functions for displaying episodes--------------------------------------------	

	//called by app.js
	display(){
		//clear episodes
		this.createEpisodes() //create episodes if neccessary
		app.ourModel.displayEpisodeRows(this)

		//return these to tell which of the time buttons to enable / disable
		var earlierExists = false
		var laterExists = false
		var nextIndex = this.bookmark - 1
		if (nextIndex >= 0){ // nextIndex is inside the array
			laterExists = true
		}
		nextIndex = this.bookmarkEarlierF(this.bookmark)
		const biggestIndex = this.savedFeed.entries.length-1
		if(nextIndex <= biggestIndex){ // nextIndex is inside the array
			earlierExists = true
		}
		return [earlierExists, laterExists]
	}

	createEpisodes(){
		const lastIndexToLoad = this.bookmarkEarlierF(this.bookmark)
		// create EpisodeRows from the saved feed if necessary
		for(var i = this.episodeRows.length; i < lastIndexToLoad; i++){ // will skip right past this if the episode is already loaded
			if (this.savedFeed.entries[i]){ //if the episode exists in the feed
				this.entryToEpisode(i)
			}
			else {
				return false
			}
		}
		return true;
	}		

	entryToEpisode(entriesIndex){

		const newDlRow = new DownloadRow(
			this.title,
			this.savedFeed.entries[entriesIndex].title,
			this.savedFeed.entries[entriesIndex].published,
			this.savedFeed.entries[entriesIndex].link,
			""
		)
		if(!(this.savedFeed.entries[entriesIndex].links[1] === undefined)){ // (has been known to be undefined)
			newDlRow.audioUrl = this.savedFeed.entries[entriesIndex].links[1].href
		}
		newDlRow.displayPodInfo = () => {app.ourModel.displayPodInfo(this)}
		//newDlRow.displayPodInfo = function(){app.ourModel.displayPodInfo(this)} // uncomment to demonstrate the "this" difference between arrow and regular functions
			
		this.episodeRows.push(
	 		new EpisodeRow(
				this.savedFeed.entries[entriesIndex].title,
	 			this.savedFeed.entries[entriesIndex].published,
	 			this.savedFeed.entries[entriesIndex].link,
	 			this.savedFeed.entries[entriesIndex].summary,
	 			newDlRow
 			)
 		)
	}

//---function for CategoryRow-----------------------------------------------------

	createEpisode(i){
		if ((i == this.episodeRows.length) && this.savedFeed.entries[i]) { // will skip right past this if the episode is already loaded or doesn't exist in the feed
			this.entryToEpisode(i)
		}
	}
}

// gets created by the PodcastRow class
export class EpisodeRow extends Component {
	// properties from feed
	title
	date
	description
	episodeUrl
	
	downloadRow // link to its downloadRow

	constructor(title, date, episodeUrl, description, downloadRow){
		super(templates.episodeRow)
		this.title = title
		this.date = date
		this.episodeUrl = episodeUrl
		this.description = description
		this.downloadRow = downloadRow
		this[SELECTED] = SELECTED // css classes
		this.updateHtml()
		this.addEventListener('mousedown', (e) => this.handleClick(e))

		// add functions to download row that it can call when it needs to access its episode row
		this.downloadRow.removeEpisodeCheck = () => {this.querySelector(CHECKBOX).checked = false}
		this.downloadRow.selectUs = this.selectUs
	}

	handleClick(e){
		switch (e.target.nodeName){
			case CHECKBOX :
				if (e.target.checked){ // uncheck it
					app.ourModel.removeDownloadRow(this.downloadRow)
				}
				else{ // check it
					app.ourModel.displayDownloadRow(this.downloadRow)
				}
	        	break
	    	default :
	    		this.selectUs()
	    		break
		}
	}

	//check both me & my download row, display my info
	selectUs = () => {
		try{ // clear last selected (try because on the very first time selecting, there will be no "last selected")
			removeClass(app.ourModel.lastSelectedEp, SELECTED)
			removeClass(app.ourModel.lastSelectedEp.downloadRow, SELECTED)
		} catch (err) {}
		addClass(this, SELECTED) 				// select me
		addClass(this.downloadRow, SELECTED) 	// also select my DownloadRow
		app.ourModel.lastSelectedEp = this
		app.ourModel.displayEpInfo(this)
	}
}

// gets created by the PodcastRow class, and supplied to the EpisodeRow constructor.
// this gives 2 chances to attach functions to DownloadRow that reference PodcastRow and EpisodeRow, respectively (by arrow functions + the "this" keyword)

/* 	could create a framework to make this more general:
	like the structure here is PodcastRow -> EpisodeRow -> DownloadRow, but this is not class inheritence,
	it is an object being given access to another object's context	*/

export class DownloadRow extends Component {
	podTitle
	title
	date
	episodeUrl
	audioUrl

	displayPodInfo 		// function set in PodcastRow.entryToEpisode - displays podcast info
	removeEpisodeCheck 	// function set in EpisodeRow constructor - removes the episode row check
	selectUs			// function set in EpisodeRow constructor - selects the episode row and me

	constructor(podTitle, title, date, episodeUrl, audioUrl){
		super(templates.downloadRow)
		this.podTitle = podTitle
		this.title = title
		this.date = date
		this.episodeUrl = episodeUrl
		this.audioUrl = audioUrl
		this[SELECTED] = SELECTED // css classes
		this[HOVER] = HOVER
		this.updateHtml()
		this.addEventListener('mousedown', (e) => this.handleClick(e))
		this.addEventListener('mouseenter', () => this.handleMouseenter())
		this.addEventListener('mouseleave', () => this.handleMouseleave())
	}

	handleClick(e){
		switch (e.target.nodeName){
			case CHECKBOX :
				if (e.target.checked){ // uncheck it - can't actually check the DownloadRow as it never appears unchecked
					this.removeEpisodeCheck()
					app.ourModel.removeDownloadRow(this)
				}
	        	break
			default :
				this.selectUs()
				break
		}
	}

	handleMouseenter(){
		this.displayPodInfo()
		//go thru each download row and highlight it if it's from the same podcast as me
		app.ourModel.downloadListArea.querySelectorAll('download-row').forEach(
			(dlRow) => {
				if(dlRow.podTitle == this.podTitle){
					addClass(dlRow, HOVER)
				}
				else{
					removeClass(dlRow, HOVER)
				}
			}
		)
	}

	handleMouseleave(){ // remove all highlights
		app.ourModel.downloadListArea.querySelectorAll('download-row').forEach(
			(dlRow) => { removeClass(dlRow, HOVER) }
		)
	}
}

//--- single UI components ----------------------------------------------

// gets created in index.html
export class PodcastInfo extends Component {
	currDataObj
	
	constructor(){
		super(templates.podcastDesc)
		this.currDataObj = { title:"", description:"", thumbnailUrl:"" }
		//this.updateHtml() //todo: comment this to make it look better
		this.addEventListener('mousedown', (e) => this.handleClick(e))
	}

	handleClick(e){
		switch(e.target.nodeName){
			case LINK :
				// do nothing, allows the link to be clickable
				break
			default :
				flipHidden(this.querySelector('#popup'))
				flipHidden(this.querySelector('#default'))
				break
		}
	}
}

// gets created in index.html7
export class EpisodeInfo extends Component {
	currDataObj

	constructor(){
		super(templates.episodeDesc)
		this.currDataObj = {}
		//this.updateHtml() //todo: comment this to make it look better
	}
}