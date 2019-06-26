(function (document) {

	//忽略HTML代码
	if (document.doctype) return;

	var link = document.createElement('link');
	link.rel = 'stylesheet';
	link.href = chrome.extension.getURL('markdownreader.css');
	document.head.appendChild(link);

	link = document.createElement('link');
	link.rel = 'stylesheet';
	link.href = chrome.extension.getURL('highlight.default.css');
	document.head.appendChild(link);

	document.body.innerHTML = `
		<div id="markdown-container"></div>
		<div id="markdown-outline"></div>
		<div id="markdown-backTop" onclick="window.scrollTo(0,0);">TOP</div>
	`;
	window.onresize = showOutline;

	var lastText = null;

	

	document.onload = function () {
		//marked插件的基本配置(存在问题: '1. a \n * b' 展示有误)
		// marked.setOptions({
		// 	renderer: new marked.Renderer(),
		// 	gfm: true,
		// 	tables: true,
		// 	breaks: false,
		// 	pedantic: false,
		// 	sanitize: false,
		// 	smartLists: true,
		// 	smartypants: false,
		// });

		
	}

	function updateMarkdown(text) {
		if (text !== lastText) {
			lastText = text;
			// document.getElementById('markdown-container').innerHTML = marked(lastText);
			var converter = new showdown.Converter({extensions: ['table']})
			document.getElementById('markdown-container').innerHTML = converter.makeHtml(lastText);
			
			document.querySelectorAll('pre code').forEach(function (block) {
				hljs.highlightBlock(block);
			});

			updateOutline();
		}
	}

	function updateOutline() {
		var arrAllHeader = document.querySelectorAll("h1,h2,h3,h4,h5,h6");
		var arrOutline = ['<ul>'];
		var header, headerText;
		var id = 0;
		var level = 0,
			lastLevel = 1;
		var levelCount = 0;
		for (var i = 0, c = arrAllHeader.length; i < c; i++) {
			header = arrAllHeader[i];
			headerText = header.innerText;

			header.setAttribute('id', id);

			level = header.tagName.match(/^h(\d)$/i)[1];
			levelCount = level - lastLevel;

			if (levelCount > 0) {
				for (var j = 0; j < levelCount; j++) {
					arrOutline.push('<ul>');
				}
			} else if (levelCount < 0) {
				levelCount *= -1;
				for (var j = 0; j < levelCount; j++) {
					arrOutline.push('</ul>');
				}
			};
			arrOutline.push('<li>');
			arrOutline.push('<a href="#' + id + '">' + headerText + '</a>');
			arrOutline.push('</li>');
			lastLevel = level;
			id++;
		}
		arrOutline.push('</ul>')
		var outline = document.getElementById('markdown-outline');
		if (arrOutline.length > 2) {
			outline.innerHTML = arrOutline.join('');
			showOutline();
		}
		else outline.style.display = 'none';
	}

	function showOutline() {
		var outline = document.getElementById('markdown-outline');
		var markdownContainer = document.getElementById('markdown-container');
		// outline.style.left = markdownContainer.offsetLeft + markdownContainer.offsetWidth + 10 + 'px';
		outline.style.maxHeight = document.body.clientHeight - 30;
		outline.style.display = 'block';
	}

	var xmlhttp = new XMLHttpRequest();
	var fileurl = location.href,
		bLocalFile = /^file:\/\//i.test(fileurl);
	xmlhttp.onreadystatechange = function () {
		if (xmlhttp.readyState == 4 && xmlhttp.status != 404) {
			updateMarkdown(xmlhttp.responseText);
		}
	};

	function checkUpdate() {
		xmlhttp.abort();
		xmlhttp.open("GET", fileurl + '?rnd=' + new Date().getTime(), true);
		xmlhttp.send(null);
		if (bLocalFile) setTimeout(checkUpdate, 500);
	}

	checkUpdate();

}(document));
