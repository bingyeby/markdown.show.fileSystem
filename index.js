(function (document) {

	//忽略HTML代码
	if (document.doctype) return;

	var link = document.createElement('link');
	link.rel = 'stylesheet';
	link.href = chrome.extension.getURL('index.css');
	document.head.appendChild(link);

	link = document.createElement('link');
	link.rel = 'stylesheet';
	link.href = chrome.extension.getURL('highlight.default.css');
	document.head.appendChild(link);

	document.body.innerHTML = `
    <div id="test"></div>
		<div id="markdown-container"></div>
		<div id="markdown-outline"></div>
		<div id="markdown-backTop" onclick="window.scrollTo(0,0);"></div>
	`;
	window.onresize = showOutline;

	var lastText = null;

  window.addEventListener('load', function () {
    // marked插件的基本配置(存在问题: '1. a \n * b' 展示有误)
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


    /*
    // let basicUrl = `file:///D:/project.01/notes/`
    // httpRequest(basicUrl).then((str) => {
    //   this.list = dealResponseText(str, basicUrl)
    //   console.log(`this. this.list`, this.list);
    // })
    * */
    function httpRequest(url) {
      return new Promise((resolve, reject) => {
        var xhr = new XMLHttpRequest();
        xhr.open("GET", url, true);
        xhr.onreadystatechange = function () {
          if (xhr.readyState == 4) {
            resolve(xhr.responseText)
          }
        }
        xhr.send();
      })
    }

    /*
    * 获取某个url下面的文件信息 name url
    * */
    function dealResponseText(str, basicUrl) {
      let addRowStr = str.match(/addRow\(\".+\"\)/gi)
      let rowList = []
      if (addRowStr) {
        rowList = _.map(addRowStr, (n) => { // n: "addRow("test.md","知识点 面试点.md",0,36182,"35.3 kB",1561428649,"2019/6/25 上午10:10:49")"
          let name = n.split(',')[0].split("\"")[1] // test.md
          return {
            name: name,
            url: basicUrl + name
          }
        })
      }
      return rowList
    }


    new Vue({
      el: '#test',
      data: {
        linkList: [
          {name: '1', url: '1', child: [{name: '11', url: '11'}, {name: '12', url: '12'}]},
          {name: '2', url: '1', child: [{name: '11', url: '11'}, {name: '12', url: '12'}]},
        ],
      },
      created() {
        this.linkList = _.map(window.location.href.split('\/'), (n, i, list) => {
          return {
            name: n,
            url: _.slice(list, 0, i + 1).join('\/') + '\/'
          }
        })
        // 默认展开最后一个
        this.showChild(_.size(this.linkList) - 2)
      },
      methods: {
        linkOpen: (url) => {
          console.log(`linkOtherMd url`, url);
          window.open(url, '_self')
        },
        showChild(index) {
          let name = this.linkList[index].name
          let url = this.linkList[index].url
          if ((name === '') || (name === 'file:') || (name === 'D:')) {
            return
          }
          httpRequest(url).then((str) => {
            // this.linkList[index].child = dealResponseText(str, url) // 直接改变不生效 在 vue 中是无法检测到根据索引值修改的数据变动的
            Vue.set(this.linkList[index], `child`, dealResponseText(str, url))
          })
        }
      },
      template: `<div id='test'>
        <div id="linkList">
            <div v-for="(item,index) in linkList" v-if="!_.includes(['','file:','D:'],item.name)">
                <div @click="showChild(index)" class="linkLi linkLiHeader">{{decodeURI(item.name)}}</div>
                <div 
                    v-for="(childLi,childLiIndex) in item.child"
                    :class="['linkLi',{'md' : /.md/.test(childLi.name)}]"
                    @click="linkOpen(childLi.url)">
                    {{childLi.name}}
                </div>
            </div>
        </div>
      <div>`
    })
  })

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
		outline.style.maxHeight = '100%';
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
