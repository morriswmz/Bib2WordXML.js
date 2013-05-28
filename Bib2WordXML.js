//(function () {
	var typeDict = {
		"ARTICLE" : "JournalArticle",
		"BOOK" : "Book",
		"INCOLLECTION" : "BookSection",
		"INPROCEEDINGS" : "ConferenceProceedings",
		"MASTERSTHESIS" : "Masters Thesis",
		"PHDTHESIS" : "PhD Thesis"
	};

	var fieldDict = {
		"author" : "Author",
		"booktitle" : "ConferenceName",
		"address" : "City",
		"edition" : "Edition",
		"editor" : "Author",
		"isbn" : "StandardNumber",
		"journal" : "JournalName",
		"month" : "Month",
		"number" : "Issue",
		"publisher" : "Publisher",
		"school" : "Institution",
		"volume" : "Volume",
		"year" : "Year",
		"comment" : "Comments",
		"pages" : "Pages",
		"title" : "Title"
	};

	var converter = {
		_getBlockContent : function (str, leftChar, rightChar) {
			var curLevel = 1,
				newIdx,
				initIdx = str.indexOf(leftChar),
				curIdx = initIdx + 1;
			if (initIdx < 0) throw new Error('Left identifier ' + leftChar + ' not found.');
			for (var i = curIdx, n = str.length;i < n;i++) {
				if (str.charAt(i) == leftChar) curLevel++;
				if (str.charAt(i) == rightChar) curLevel--;
				if (curLevel == 0) break;
			}
			
			if (curLevel > 0) throw new Error('Block not closed.');
			return {
				leftIndex : initIdx,
				rightIndex : i,
				content : str.slice(initIdx + 1, i - initIdx)
			};
		},
		_escapeHTMLTag : function (str) {
			return str.replace(/&/g, '&amp;')
					  .replace(/</g, '&lt;')
					  .replace(/>/g, '&gt;');
		},
		_createNormalNode : function (type, content, attrs) {
			var attrStr = '';
			if (attrs != undefined) {
				attrStr = ' ';
				for (var key in attrs) {
					attrStr += key + '="' + attrs[key].toString() + '" ';
				}
			}
			return '<b:' + type + attrStr + '>' + content + '</b:' + type + '>';
		},
		_createAuthorNode : function (authorStr) {
			authorStr = authorStr.trim();
			var xml = '',
				curPersonXML,
				names = authorStr.split(/\s+and\s+/i),
				nameParts;

			for (var i = 0, n = names.length;i < n;i++) {
				curPersonXML = '';
				nameParts = names[i].split(/\s*,\s*/);
				if (nameParts.length == 1) {
					curPersonXML = this._createNormalNode('Last', nameParts[0].trim());
				} else if (nameParts.length == 2) {
					curPersonXML += this._createNormalNode('First', nameParts[0].trim());
					curPersonXML += this._createNormalNode('Last', nameParts[1].trim());
				} else if (nameParts.length == 3) {
					curPersonXML += this._createNormalNode('First', nameParts[0].trim());
					curPersonXML += this._createNormalNode('Middle', nameParts[1].trim());
					curPersonXML += this._createNormalNode('Last', nameParts[2].trim());
				} else {
					throw new Error('Invaid author name : ' + names[i]);
				}
				xml += this._createNormalNode('Person', curPersonXML);
			}

			xml = this._createNormalNode('NameList', xml);
			xml = this._createNormalNode('Author', xml);
			return this._createNormalNode('Author', xml);
		},
		_createDetailNodes : function (str) {
			str = str.replace(/[\n\r]/g, '').trim();
			var curMatch,
				curFieldName,
				tmpResult,
				xml = '';
			while (curMatch = str.match(/(\w+)\s*=\s*/)) {
				curFieldName = fieldDict[curMatch[1].toLowerCase()];
				str = str.slice(curMatch.index + curMatch[0].length);
				tmpResult = this._getBlockContent(str, '{', '}');
				str = str.slice(tmpResult.rightIndex + 1);
				if (curFieldName != undefined) {
					if (curFieldName == fieldDict['author']) {
						xml += this._createAuthorNode(tmpResult.content);
					} else {
						xml += this._createNormalNode(curFieldName, this._escapeHTMLTag(tmpResult.content));
					}
				}
			}
			return xml;
		},
		convert : function (str) {
			var resultTmp,
				curSectionMatch,
				curSectionType,
				curSectionTag,
				curSectionContent,
				curSectionXMLContent,
				xmlContent = '';

			while (curSectionMatch = str.match(/@(\w+)/i)) {
				curSectionType = curSectionMatch[1].toUpperCase();
				if (typeDict[curSectionType] == undefined) {
					throw new Error('Unknown type ' + curSectionMatch[1]);
				}
				resultTmp = this._getBlockContent(str, '{', '}');
				str = str.slice(resultTmp.rightIndex + 1);
				curSectionContent = resultTmp.content;
				resultTmp = curSectionContent.match(/([^,]+?),/);
				if (!resultTmp) throw new Error('No valid tag found.');
				curSectionTag = resultTmp[1];
				curSectionXMLContent = this._createNormalNode('SourceType', typeDict[curSectionType]);
				curSectionXMLContent += this._createNormalNode('Tag', curSectionTag.trim());
				curSectionXMLContent += this._createDetailNodes(curSectionContent.slice(resultTmp.index + resultTmp[0].length));
				xmlContent += this._createNormalNode('Source', curSectionXMLContent);
			}

			return this._createNormalNode('Sources', xmlContent, {
				'SelectedStyle' : "",
				'xmlns:b' : "http://schemas.openxmlformats.org/officeDocument/2006/bibliography",
				'xmlns' : "http://schemas.openxmlformats.org/officeDocument/2006/bibliography"
			});
		}
	};

//})();