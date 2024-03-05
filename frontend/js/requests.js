const apiAddress = 'http://23.254.144.254:5001'
const podRoute = '/podinfo'
const requestObjData = {method:'POST', headers:{'Content-Type':'application/json'}}

export function pod(url){
	requestObjData.body = JSON.stringify({url:url})
    return new Request(apiAddress+podRoute, requestObjData)
}