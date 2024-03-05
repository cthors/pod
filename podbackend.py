import feedparser
from flask import Flask, request, jsonify
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

@app.route('/')
def index():
    return "<h3 style='color:blue'>Hello, welcome to my API for retrieving podcast feeds </h3>"

@app.route('/podinfoo', methods=['POST'])
def getpodinfoo():
    request_data = request.get_json()
    feed_result = feedparser.parse(request_data['url'])
    #return jsonify(feed_result)
    return jsonify(feed_result.feed)

@app.route('/epinfoo', methods=['POST'])
def getepinfoo():
    request_data = request.get_json()
    feed_result = feedparser.parse(request_data['url'])
    if len(request_data) == 2:
        response_data = feed_result.entries[request_data['startIndex']]
    else:
        response_data = feed_result.entries[request_data['startIndex']:request_data['endIndex']]
    return jsonify(response_data)

@app.route('/podinfo', methods=['POST'])
def getpodinfo():
    request_data = request.get_json()
    feed_result = feedparser.parse(request_data['url'])  
    return jsonify(feed_result)

if __name__ == "__main__":
    app.run()
