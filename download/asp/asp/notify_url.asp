<!--#include file="config.asp" -->
<!--#include file="md5.asp" -->
<%
pid=Request.QueryString("pid")
namex=Request.QueryString("name")
money=Request.QueryString("money")
out_trade_no=Request.QueryString("out_trade_no")
trade_no=Request.QueryString("trade_no")
param=Request.QueryString("param")
trade_status=Request.QueryString("trade_status")
typex=Request.QueryString("type")
sign=Request.QueryString("sign")
sign_type=Request.QueryString("sign_type")


if lcase(MD5("money="&money&"&name="&namex&"&out_trade_no="&out_trade_no&"&param="&param&"&pid="&pid&"&trade_no="&trade_no&"&trade_status="&trade_status&"&type="&typex&pkey,"utf-8"))=lcase(sign) then
'
'
'
'
'
'
'请在此处处理您自己的业务逻辑
'支付成功的信息会多次向该页面通知，请注意去重复
'
'
'
'
'
response.write "success"
else
response.write "fail"
end if
%>
<script language="JScript" runat="Server">
function ToObject(json) {
    var o;
    eval("o=" + json);
    return o;
}
</script>