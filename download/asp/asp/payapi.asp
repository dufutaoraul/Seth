<!--#include file="config.asp" -->
<!--#include file="md5.asp" -->
<%
body=request.form("body")
fee=request.form("fee")
no=request.form("no")
remark=request.form("remark")
pay_type=request.form("pay_type")

str="money="&fee&"&name="&body&"&notify_url="&notify_url&"&out_trade_no="&no&"&param="&remark&"&pid="&pid&"&return_url="&return_url&"&type="&pay_type

sign=lcase(MD5(str&pkey,"utf-8"))
url="https://z-pay.cn/submit.php?"&str&"&sign="&sign

response.redirect url
%>