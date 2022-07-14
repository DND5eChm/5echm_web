import re
import requests
from lxml import etree
from lxml import html
import json
import time
import pymysql
import json

class chm_to_py():
    hcc_path = "html/content.hhc"
    title = "2_1_Pathfinder v2.01"
    html_warp = '''
    <!doctype html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport"
          content="width=device-width, user-scalable=no, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0">
    <meta http-equiv="X-UA-Compatible" content="ie=edge">
    <title>Document</title>
</head>
<body>'''

    def deal_hcc(self):
        f = open(self.hcc_path, "r")
        hcc_content = f.read()
        html_warp = self.html_warp.format(self.title)
        hcc_content = hcc_content.lower()
        html_body = re.findall(re.compile('<body>(.*?)<\/body>', re.S|re.I), hcc_content)[0]
        # html_body = html_body.encode('gbk').decode('gbk').decode('utf8')
        #正则补全</LI>
        html_body = re.sub(r'<li>(.*?)<ul>(.*?)</ul>', r'<li>\1<ul>\2</ul></li>', html_body, flags = re.S|re.I)
        html_body = re.sub(r'<li>(.*?)</object>\s+(</ul></li>\s+)?(?=<li>)', r'<li>\1</object></li>\2', html_body, flags=re.S | re.I)
        html_body = (html_warp + html_body + "</body></html>").lower()

        # f = open("html.html", 'w')
        # f.write(html_body)
        # exit()
        sel = etree.HTML(html_body)
        rootul = sel.xpath('body/ul')[0]
        result = self.deal_ul(rootul)
        #组装成html代码
        json_str = json.dumps(result,ensure_ascii=False)
        f = open("menu.js", "w", encoding='utf8')
        f.write("var json_str = " + json_str)

    #递归解析每一层
    def deal_ul(self, ul):
        if ul == []:
            return []
        li_list = []
        try:
            lis = ul.xpath('./li')
        except  Exception as e:
            print(repr(e))
            return []

        for li in lis:
            # print(li.xpath('./ul'), li.xpath('./object/param[@name="name"]/@value')[0])
            li_list.append({
                "name" : '' if li.xpath('./object/param[@name="name"]/@value') == [] else  li.xpath('./object/param[@name="name"]/@value')[0],
                "local" : '' if li.xpath('./object/param[@name="local"]/@value') == [] else  li.xpath('./object/param[@name="local"]/@value')[0],
                "imagenumber" : '' if li.xpath('./object/param[@name="imagenumber"]/@value') == [] else li.xpath('./object/param[@name="imagenumber"]/@value')[0],
                "childs" : [] if li.xpath('./ul') == [] else self.deal_ul(li.xpath('./ul')[0])
            })
        return li_list
chm_to_py().deal_hcc()