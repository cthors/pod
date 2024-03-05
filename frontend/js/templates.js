function formatDate(unformattedDate){
	try{
	    const datePieces = unformattedDate.split(' ') // [Thu, 08 Dec 2022 12:00:00 -0800]
	    return `${datePieces[1]} ${datePieces[2]} ${datePieces[3]}`
	}catch(err){}
}

function formatLink(url, title){
	if (url === undefined){
		return `${title}`
	}
	else{
		return `<a href='${url}' target='_blank'>${title}</a>`
	}
}

export const categoryRow = function(){
	return `<div class='category-holder space-between'>
		        <span>${this.title}</span>
		        <button>Hide</button>
		    </div>`
}

export const podcastRow = function(){
    return `<div class='space-between'>
                <span class='beneath'>${this.labelField}</span>
            </div>`
}

export const episodeRow = function(){
	return `<div class='episode-holder space-between'>
		        <span class='beneath'>
		            <input type='checkbox'>
		            <span>${this.title}</span>
		        </span>
		        <span class='date'>${formatDate(this.date)}</span>
		    </div>`
}

export const downloadRow = function(){
	return `<div class='episode-holder space-between' title='${this.podTitle}'>
		        <span class='beneath'>
		            <input type='checkbox' checked>
		            <span>${this.title}</span>
		        </span>
		        <span class='date'>${formatDate(this.date)}</span>
		    </div>`
}

// note: some podcasts have a summary, some have a subtitle, some have both (shorter subtitle, longer summary)
export const podcastDesc = function(){
    return `<img src='${this.currDataObj.thumbnailUrl || "img/category_img.jpg"}'></img>
    		<span id='popup' hidden>
    			<h3>${this.currDataObj.title}</h3>
    			<h4>${this.currDataObj.author}</h4>
	            <p>${this.currDataObj.summary || this.currDataObj.subtitle}</p>
	        </span>
            	
            <div id='default'>
                <h3>${formatLink(this.currDataObj.podcastUrl, this.currDataObj.title)}</h3>
                <span>${this.currDataObj.subtitle || this.currDataObj.summary}</span>
            </div>`
}

export const episodeDesc = function(){
    return `<div>
    			<span class='space-between'>
		    		<h3>${formatLink(this.currDataObj.episodeUrl, this.currDataObj.title)}</h3>
		    		<span class='date'>${formatDate(this.currDataObj.date)}</span>
	    		</span>
	            <span>${this.currDataObj.description}</span>
            </div>`
}