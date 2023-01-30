# 5echm_web

这个项目的目的是将5echm转换成静态网页版本,并方便地在各种设备的浏览器上访问。

主域名 https://5echm.kagangtuya.top

托管于Netlify，备用域名 https://5echmdev.netlify.app

使用了 fastly.jsdelivr.net 来对部分js文件进行国内访问加速

使用工具为

[优秀小巧的 CHM 编辑器 WinCHM Pro 5.492 中文免费版 - 大眼仔旭 (dayanzai.me)](http://www.dayanzai.me/winchm.html)

gbk与utf混杂情况下统一修正为uf8的python脚本参考

```python
import os
import chardet
def convert_encoding(folder):
    for dirpath, dirnames, filenames in os.walk(folder):
        for filename in filenames:
            if not (filename.endswith('.html') or filename.endswith('.htm')):
                continue
            file_path = os.path.join(dirpath, filename)
            try:
                with open(file_path, 'r', encoding='utf-8') as f:
                    content = f.read()
            except:
                try:          
                    with open(file_path, 'r', encoding='gbk', errors='ignore') as f:
                        content = f.read()
                except:
                    with open(file_path, 'r', encoding='gb18030', errors='ignore') as f:
                        content = f.read()
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write(content)
convert_encoding(r"H:\111\5echm_web\topics")
```

