<%@ LANGUAGE = VBScript.encode%>
<%
Session.CodePage=65001
Response.Charset="UTF-8"

pid="20220726190052"
pkey="vg9ZRZN4FOKtDM06UfqH69GDJoG4gGIJ"

'请在此处配置好您的pid及pkey，可以从7支付 -> 会员中心 -> 支付设置 -> API安全 页面中获得


notify_url="http://www.your_domain/notify_url.asp" '异步通知页面
return_url="http://www.your_domain/return_url.asp" '支付完成后的跳转页面

'请将以上两项修改为您自己的网址
%>