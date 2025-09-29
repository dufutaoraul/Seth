//
// Created by Administrator on 2024/4/8.
//

#ifndef BAOLIAN_PAY_H
#define BAOLIAN_PAY_H


#include <string>
#include <map>
#include <vector>
#include <algorithm>
#include <iostream>
#include <sstream>
#include <openssl/md5.h>
#include <iomanip>

class Pay {
private:
    std::string pid = "";//商户id
    std::string key = "";//商户密钥
    std::string url = "https://z-pay.cn";//支付地址
    std::string type = "alipay";//支付类型
    std::string signType = "MD5";//签名类型
    std::string notify_url = "http://www.aaa.com/notify_url.php";//通知接口
    std::string return_url = "http://www.aaa.com/notify_url.php";//返回界面


    // 自定义比较函数，按照键的字母顺序（a-z）进行排序
    bool compare(const std::pair<std::string, std::string> &a, const std::pair<std::string, std::string> &b) {
        return a.first < b.first;
    }

    std::map<std::string, std::string> sortMapByKey(const std::map<std::string, std::string> &inputMap) {
        // 将输入的 map 转换为 vector
        std::vector<std::pair<std::string, std::string>> vec(inputMap.begin(), inputMap.end());

        // 使用自定义的比较函数对 vector 中的元素按照键的字母顺序（a-z）进行排序
        std::sort(vec.begin(), vec.end(), [this](const auto &a, const auto &b) {
            return compare(a, b);
        });

        // 创建一个新的有序 map，将排序后的键值对插入其中
        std::map<std::string, std::string> sortedMap;
        for (const auto &pair: vec) {
            sortedMap.insert(pair);
        }

        return sortedMap;
    }

    std::string mapToQueryString(const std::map<std::string, std::string> &params) {
        std::ostringstream oss;

        for (auto it = params.begin(); it != params.end(); ++it) {
            if (it != params.begin()) {
                oss << "&";
            }
            // 将键值对连接成键值对形式，形如 "key=value"
            oss << it->first << "=" << it->second;
        }

        // 返回完整的查询字符串
        return oss.str();
    }

     std::string calculateMD5(const std::string &input) {
        unsigned char digest[MD5_DIGEST_LENGTH];
        MD5((const unsigned char *) input.c_str(), input.length(), digest);
        std::stringstream ss;
        for (unsigned char i: digest) {
            ss << std::hex << std::setw(2) << std::setfill('0') << static_cast<int>(i);
        }
        return ss.str();
    }

public:
    /**
     *
     * @param name //商品名
     * @param money //价格
     * @param out_trade_no //商户单号
     * @return
     */
    std::string getUrl(const std::string& name,const std::string& money,const std::string &out_trade_no) {
        std::map<std::string, std::string> maps;
        maps["name"] = name;
        maps["money"] = money;
        maps["type"] = type;
        maps["out_trade_no"] = out_trade_no;
        maps["notify_url"] = notify_url;
        maps["pid"] = pid;
        maps["return_url"] = return_url;

        // 调用函数对 map 按键进行排序
        std::map<std::string, std::string> sortedMap = sortMapByKey(maps);
        std::string queryString = mapToQueryString(sortedMap);
        queryString += key;

        //md5签名
        std::string md5 = calculateMD5(queryString);
        sortedMap["sign_type"] = signType;
        sortedMap["sign"] = md5;

        std::string path = mapToQueryString(sortedMap);
        return url + "/submit.php?" + path;
    }
};


#endif //BAOLIAN_PAY_H
