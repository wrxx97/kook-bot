export function parseHtmlTableTo2DArray(html) {
  const dataArray = [];

  // 匹配表头
  const theadPattern = /<thead>([\s\S]*?)<\/thead>/;
  const theadMatch = html.match(theadPattern);

  if (theadMatch) {
    // 提取表头信息
    const headers = theadMatch[1]
      .match(/<th>(.*?)<\/th>/g)
      .map(function (header) {
        return header.replace(/<th>|<\/th>/g, '').trim();
      });

    dataArray.push(headers);
  }

  // 匹配表体
  const tbodyPattern = /<tbody>([\s\S]*?)<\/tbody>/;
  const tbodyMatch = html.match(tbodyPattern);

  if (tbodyMatch) {
    // 匹配每一行
    const rows = tbodyMatch[1].match(/<tr>([\s\S]*?)<\/tr>/g);

    if (rows) {
      // 遍历每一行
      rows.forEach(function (row) {
        // 匹配每个单元格
        const cells = row.match(/<t[dh]>(.*?)<\/t[dh]>/g);

        if (cells) {
          // 提取每个单元格的内容并添加到数组中
          const rowData = cells.map(function (cell) {
            return cell.replace(/<t[dh]>|<\/t[dh]>/g, '').trim();
          });

          dataArray.push(rowData);
        }
      });
    }
  }

  return dataArray;
}
