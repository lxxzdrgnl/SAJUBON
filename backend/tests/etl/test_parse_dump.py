import pytest
from scripts.etl.parse_dump import iter_table_rows, list_tables

SAMPLE = '''
DROP TABLE IF EXISTS `F007`;
CREATE TABLE `F007` (
  `DB_num` int(11) DEFAULT NULL,
  `DB_title` text,
  `DB_data` text
) ENGINE=MyISAM DEFAULT CHARSET=utf8;
LOCK TABLES `F007` WRITE;
INSERT INTO `F007` VALUES (1,'태몽','용꿈은 <BR>귀한 자식'),(2,'둘째','뱀 꿈, \'\'길몽\'\'이다');
UNLOCK TABLES;
CREATE TABLE `S087` (
  `DB_num` int(11) DEFAULT NULL,
  `DB_data` text
);
INSERT INTO `S087` VALUES (1,'오늘의 총운');
'''

def test_list_tables(tmp_path):
    p = tmp_path / "dump.sql"; p.write_text(SAMPLE, encoding="utf-8")
    assert list_tables(p) == ["F007", "S087"]

def test_iter_rows_columns_and_escapes(tmp_path):
    p = tmp_path / "dump.sql"; p.write_text(SAMPLE, encoding="utf-8")
    rows = list(iter_table_rows(p, "F007"))
    assert rows[0] == {"DB_num": 1, "DB_title": "태몽", "DB_data": "용꿈은 <BR>귀한 자식"}
    assert rows[1]["DB_data"] == "뱀 꿈, '길몽'이다"   # '' 이스케이프 해제

def test_missing_table(tmp_path):
    p = tmp_path / "dump.sql"; p.write_text(SAMPLE, encoding="utf-8")
    assert list(iter_table_rows(p, "NOPE")) == []
