# case-screenshots

把拼团认领管理系统的脱敏截图放在这里。

推荐命名：

- admin-overview.png
- client-stock.png
- settlement.png
- shipping.png

替换时在 `group-system-case.html` 里把 `.shot-placeholder` 换成：

```html
<img class="case-shot-image" src="case-screenshots/admin-overview.png" alt="管理端总览截图">
```

截图前记得遮掉真实 CN、收货信息、订单、token、Gist ID 和真实商品隐私。
