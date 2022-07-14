### 中文

这个项目的目的是将chm电子书转换成静态网页版本,并能在网站上访问.只测试了`2_1_Pathfinder v2.01简体.chm`这个文件,不保证兼容性

 - 1.使用windows自带hh工具将chm解包 
    eg. `hh -decompile C:\Users\chenzihan\Desktop\chm_to_html-master\html C:\Users\chenzihan\Desktop\chm_to_html-master 5E 不全书 天麟版v2021.12.09.chm`

- 2.执行`strlower.py`将`html/`中导出的文件名转换为utf8,小写 (后面url会访问到小写路径)
   `python strlower.py`
- 3.执行chm_to_html.py将html/content.hhc转换为`index.html` 和 `menu.js` 使用了`mmenu.js`插件
   `python chm_to_html.py`


### English
The purpose of this project is to convert a chm e-book into a static web version that can be accessed on a website. Only tested the file `2_1_Pathfinder v2.01简体.chm`, compatibility is not guaranteed

 - 1. Unpack the chm using the hh tool that comes with windows 
   eg.`hh -decompile D:\download\chmToHtml-master\html D:\download\chmToHtml-master\2_1_Pathfinder v2.01简体.chm`

- 2. Execute `strlower.py` to convert the exported filename in `html/` to utf8,lowercase (the later url will access the lowercase path)
   `python strlower.py`
- 3. Execute chm_to_html.py to convert html/content.hhc to `index.html` and `menu.js` using the `mmenu.js` plugin
   `python chm_to_html.py`

