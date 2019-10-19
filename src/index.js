/**
 * 横向拖动内容，滚动条滚动
 * @param {string} container 需要拖动的面板
 */
function dragMoveX(container) {
  let flag;
  let downX;
  let scrollLeft;

  container.addEventListener("mousedown", function (event) {
    flag = true;
    downX = event.clientX;
    scrollLeft = this.scrollLeft;
  });

  container.addEventListener("mousemove", function (event) {
    if (flag) {
      let moveX = event.clientX;
      let scrollX = moveX - downX;
      if (scrollX < 0 && scrollLeft > 0) {
        this.scrollLeft = scrollLeft - scrollX
      }
      else {
        this.scrollLeft = scrollLeft - scrollX
      }
    }
  });

  container.addEventListener("mouseup", function () {
    flag = false;
  });

  container.addEventListener("mouseout", function (event) {
    if (event.pageX < 0 || event.pageX > document.body.offsetWidth) {
      flag = false;
    }
  });
}


/*
* 测试 httpRequest dealResponseText
* */
// let basicUrl = `file:///D:/project.01/notes/`
// httpRequest(basicUrl).then((str) => {
//   this.list = dealResponseText(str, basicUrl)
//   console.log(`this. this.list`, this.list);
// })

/*
* 获取某个url下面的文件信息 name url
* */
function dealResponseText(str, basicUrl) {
  let addRowStr = str.match(/addRow\(\".+\"\)/gi)
  let rowList = []
  if (addRowStr) {
    rowList = _.map(addRowStr, (n) => { // n: `addRow("test.md","知识点 面试点.md",0,36182,"35.3 kB",1561428649,"2019/6/25 上午10:10:49")`
      let name = n.split(',')[0].split("\"")[1] // test.md
      let type = n.split(',')[2]
      return {
        name,
        url: basicUrl + name + '\/',
        type,
      }
    })
  }
  return rowList
}

/**
 * 发起请求
 */
function httpRequest(url) {
  return new Promise((resolve, reject) => {
    let xhr = new XMLHttpRequest();
    xhr.open("GET", url, true);
    xhr.onreadystatechange = function () {
      if (xhr.readyState == 4) {
        resolve(xhr.responseText)
      }
    }
    xhr.send();
  })
}


(function (document) {
  //忽略HTML代码
  if (document.doctype) return;

  let link = document.createElement('link');
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

  let lastText = null;
  window.addEventListener('load', function () {
    new Vue({
      el: '#test',
      data: {
        currentUrlList: ['11', '21'],
        linkList: [
          [{name: '11', url: '11'}, {name: '12', url: '12'}],
          [{name: '21', url: '21'}, {name: '22', url: '22'}]
        ],
      },
      created() {
        this.currentUrlList = window.location.href.split('\/') //  ["file:", "", "", "D:", "01", "notes", "2-velocity.md"]
        this.linkList = _.map(this.currentUrlList, (n, i, list) => {
          return [{
            active: true,
            name: n,
            url: _.slice(list, 0, i + 1).join('\/') + '\/'
          }]
        })

        ~(async () => {
          let xIndex = 0
          for (const item of _.dropRight(this.currentUrlList, 1)) {
            if (!_.includes(['file:', ''], item)) {
              let yIndex = _.findIndex(this.linkList[xIndex], {name: this.currentUrlList[xIndex]})
              await this.showChild(xIndex, yIndex)
            }
            xIndex++
          }
        })()
      },
      methods: {
        async showChild(index, childLiIndex) {
          let childList = this.linkList[index][childLiIndex]
          let name = childList.name
          let url = childList.url
          _.each(this.linkList[index], (n, i) => {
            n.active = childLiIndex === i
          })
          if ((name === '') || (name === 'file:')) {
            return
          }
          if (childList.type === '0') {
            if (/\.md$/.test(name)) {
              window.open(url.replace(/\/$/, ''), '_self')
            } else {
              if (/\.png$/.test(name)) {
                window.open(url.replace(/\/$/, ''))
              }
            }
          } else {
            await httpRequest(url).then((str) => {
              // 在vue中是无法检测到根据索引值修改的数据变动的,需要通过Vue.set()
              Vue.set(this.linkList, [index + 1], dealResponseText(str, url))
            })
          }
        }
      },
      template: `<div>
        <div id="linkList">
            <div v-for="(item,index) in linkList" v-if="!_.includes(['','file:'],item[0].name)">
                <div 
                    v-for="(childLi,childLiIndex) in item"
                    :class="['linkLi',{'md' : /.md$/.test(childLi.name)},{'folder': childLi.type === '1' },{'folderActive': childLi.active }]"
                    :title="childLi.name"
                    :data-url="childLi.url"
                    @click="showChild(index,childLiIndex)">
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
      let converter = new showdown.Converter({extensions: ['table']})
      document.getElementById('markdown-container').innerHTML = converter.makeHtml(lastText);

      document.querySelectorAll('pre code').forEach(function (block) {
        hljs.highlightBlock(block);
      });

      updateOutline();

      // 横向滚动支持横向块拖动
      _.each(document.querySelectorAll('pre code'), (n) => {
        dragMoveX(n)
      })
      // 图片点击可以在新的标签打开
      document.querySelectorAll('img').forEach((n) => {
        n.addEventListener('click', () => {
          window.open(n.src)
        })
      })
    }
  }

  function updateOutline() {
    let arrAllHeader = document.querySelectorAll("h1,h2,h3,h4,h5,h6");
    let arrOutline = ['<ul>'];
    let header, headerText;
    let id = 0;
    let level = 0,
        lastLevel = 1;
    let levelCount = 0;
    for (let i = 0, c = arrAllHeader.length; i < c; i++) {
      header = arrAllHeader[i];
      headerText = header.innerText;
      header.setAttribute('id', id);
      level = header.tagName.match(/^h(\d)$/i)[1];
      levelCount = level - lastLevel;
      if (levelCount > 0) {
        for (let j = 0; j < levelCount; j++) {
          arrOutline.push('<ul>');
        }
      } else if (levelCount < 0) {
        levelCount *= -1;
        for (let j = 0; j < levelCount; j++) {
          arrOutline.push('</ul>');
        }
      }
      arrOutline.push('<li>');
      arrOutline.push('<a href="#' + id + '">' + headerText + '</a>');
      arrOutline.push('</li>');
      lastLevel = level;
      id++;
    }
    arrOutline.push('</ul>')
    let outline = document.getElementById('markdown-outline');
    if (arrOutline.length > 2) {
      outline.innerHTML = arrOutline.join('');
      showOutline();
    }
    else outline.style.display = 'none';
  }

  function showOutline() {
    let outline = document.getElementById('markdown-outline');
    let markdownContainer = document.getElementById('markdown-container');
    // outline.style.left = markdownContainer.offsetLeft + markdownContainer.offsetWidth + 10 + 'px';
    outline.style.maxHeight = '100%';
    outline.style.display = 'block';
  }

  let xmlhttp = new XMLHttpRequest();
  let fileurl = location.href,
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
    if (bLocalFile) setTimeout(checkUpdate, 1000);
  }

  checkUpdate();

}(document));
