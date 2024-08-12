var strings = new Object();

if(navigator.browserLanguage){
  lang = navigator.browserLanguage;
}else{
  lang = navigator.language;
}

if (lang=='zh-cn') { lang = 'cn';}

lang = lang.substr(0,2).toLowerCase();

lang="en";

if(lang=='de'){/////////////////////////////German////////////////////////////////////////////////////

strings["Contents"]                              = "Inhalt";
strings["Index"]                                 = "Index";
strings["Search"]                                = "Suche";
strings["Bookmark"]                              = "Lesezeichen";

strings["Loading the data for search..."]        = "Laden der Daten für die Suche ...";
strings["Type in the word(s) to search for:"]    = "Geben Sie das Wort für die Suche nach:";
strings["Search title only"]                     = "Suche Titel nur";
strings["Search previous results"]               = "Suche frühere Resultate";
strings["Display"]                               = "Anzeige";
strings["No topics found!"]                      = "Keine Themen gefunden!";

strings["Type in the keyword to find:"]          = "Geben Sie das Stichwort zu finden:";

strings["Show all"]                              = "Alle anzeigen";
strings["Hide all"]                              = "Alle ausblenden";
strings["Previous"]                              = "Zurück";
strings["Next"]                                  = "Weiter";

strings["Loading table of contents..."]          = "Lade Inhaltsverzeichnis ...";

strings["Topics:"]                               = "Themen";
strings["Current topic:"]                        = "Aktuelles Thema:";
strings["Remove"]                                = "Entfernen";
strings["Add"]                                   = "Hinzufügen";


}else if(lang=='fr'){///////////////////////French/////////////////////////////////////////////////////////////

strings["Contents"]                              = "Contenu";
strings["Index"]                                 = "Index";
strings["Search"]                                = "Rechercher";
strings["Bookmark"]                              = "Signet";

strings["Loading the data for search..."]        = "Chargement des données pour la recherche ...";
strings["Type in the word(s) to search for:"]    = "Tapez le mot à rechercher:";
strings["Search title only"]                     = "Rechercher dans les titres seulement";
strings["Search previous results"]               = "Rechercher résultats précédents";
strings["Display"]                               = "Afficher";
strings["No topics found!"]                      = "Pas de sujets trouvés!";

strings["Type in the keyword to find:"]          = "Entrez le mot-clé à trouver:";

strings["Show all"]                              = "Afficher tout";
strings["Hide all"]                              = "Masquer tous";
strings["Previous"]                              = "Précédent";
strings["Next"]                                  = "Suivant";

strings["Loading table of contents..."]          = "Chargement table des matières..."; 

strings["Topics:"]                               = "Thèmes";
strings["Current topic:"]                        = "Current topic:";
strings["Remove"]                                = "Supprimer";
strings["Add"]                                   = "Ajouter";


}else if(lang=='nl'){//////////////////////////Dutch//////////////////////////////////////////////////////////

strings["Contents"]                              = "Inhoud";
strings["Index"]                                 = "Index";
strings["Search"]                                = "Zoeken";
strings["Bookmark"]                              = "Favorieten";

strings["Loading the data for search..."]        = "Het laden van de gegevens voor zoek ...";
strings["Type in the word(s) to search for:"]    = "Typ het woord in om te zoeken naar:";
strings["Search title only"]                     = "Zoeken in titels alleen";
strings["Search previous results"]               = "Zoeken vorige resultaten";
strings["Display"]                               = "Weergave";
strings["No topics found!"]                      = "Geen onderwerpen gevonden!";

strings["Type in the keyword to find:"]          = "Typ het trefwoord te zoeken:";

strings["Show all"]                              = "Toon alle";
strings["Hide all"]                              = "Alles verbergen";
strings["Previous"]                              = "Vorige";
strings["Next"]                                  = "Volgende";

strings["Loading table of contents..."]          = "Laden inhoudsopgave ...";

strings["Topics:"]                               = "Onderwerpen";
strings["Current topic:"]                        = "Huidig onderwerp:";
strings["Remove"]                                = "Verwijder";
strings["Add"]                                   = "Voeg toe";


}else if(lang=='it'){//////////////////////////Italian////////////////////////////////////////////////

strings["Contents"]                              = "Contenuti";
strings["Index"]                                 = "Indice";
strings["Search"]                                = "Cerca";
strings["Bookmark"]                              = "Segnalibro";

strings["Loading the data for search..."]        = "Caricamento dei dati per la ricerca ...";
strings["Type in the word(s) to search for:"]    = "Inserisci la parola per la ricerca di:";
strings["Search title only"]                     = "Cerca solo titolo";
strings["Search previous results"]               = "Cerca risultati precedenti";
strings["Display"]                               = "Visualizza";
strings["No topics found!"]                      = "Nessun argomenti trovato!";

strings["Type in the keyword to find:"]          = "Inserisci la parola chiave per trovare:";

strings["Show all"]                              = "Mostra tutti";
strings["Hide all"]                              = "Nascondi tutto";
strings["Previous"]                              = "Precedente";
strings["Next"]                                  = "Avanti";

strings["Loading table of contents..."]          = "Caricamento della tabella dei contenuti ...";

strings["Topics:"]                               = "Argomenti";
strings["Current topic:"]                        = "Tema attuale:";
strings["Remove"]                                = "Rimuovi";
strings["Add"]                                   = "Aggiungi";


}else if(lang=='se'){//////////////////////////Spanish////////////////////////////////////////////////

strings["Contents"]                              = "Contenidos";
strings["Index"]                                 = "Índice";
strings["Search"]                                = "Buscar";
strings["Bookmark"]                              = "Guardar";

strings["Loading the data for search..."]        = "Carga de los datos para la búsqueda ...";
strings["Type in the word(s) to search for:"]    = "Escriba la palabra a buscar:";
strings["Search title only"]                     = "Buscar en el título sólo";
strings["Search previous results"]               = "Buscar en los resultados anteriores";
strings["Display"]                               = "Mostrar";
strings["No topics found!"]                      = "No hay temas encontrado!";

strings["Type in the keyword to find:"]          = "Escribir la palabra clave para buscar:";

strings["Show all"]                              = "Mostrar todos";
strings["Hide all"]                              = "Ocultar todos";
strings["Previous"]                              = "Anterior";
strings["Next"]                                  = "Siguiente";

strings["Loading table of contents..."]          = "Carga de la tabla de contenido ...";

}else if(lang=='pt'){//////////////////////////Portuguese//////////////////////////////////////////////

strings["Topics:"]                               = "Temas";
strings["Current topic:"]                        = "Tema actual:";
strings["Remove"]                                = "Eliminar";
strings["Add"]                                   = "Añadir";


strings["Contents"]                              ="Conteúdo";
strings["Index"]                                 ="índice";
strings["Search"]                                ="Pesquisar";
strings["Bookmark"]                              ="Bookmark";

strings["Loading the data for search..."]        ="Colocar os dados para pesquisa ...";
strings["Type in the word(s) to search for:"]    ="Digite a palavra para procurar:";
strings["Search title only"]                     ="Buscar título apenas";
strings["Search previous results"]               ="Pesquisar resultados anteriores";
strings["Display"]                               ="Exibir";
strings["No topics found!"]                      ="Nenhum tópico encontrado!";

strings["Type in the keyword to find:"]          ="Digite a palavra-chave para encontrar:";

strings["Show all"]                              ="Mostrar tudo";
strings["Hide all"]                              ="Ocultar tudo";
strings["Previous"]                              ="Anterior";
strings["Next"]                                  ="Próximo";

strings["Loading table of contents..."]          ="Carregando tabela de conteúdos ...";

strings["Topics:"]                               ="Tópicos";
strings["Current topic:"]                        ="Tema atual:";
strings["Remove"]                                ="Remover";
strings["Add"]                                   ="Adicionar";

}else if(lang=='ja'){//////////////////////////Japanese/////////////////////////////////////////////////

strings["Contents"]                              ="内容";
strings["Index"]                                 ="索引";
strings["Search"]                                ="探す";
strings["Bookmark"]                              ="しおり";

strings["Loading the data for search..."]        ="検索用のデータを読み込んでいます...";
strings["Type in the word(s) to search for:"]    ="検索する単語を入力してください：";
strings["Search title only"]                     ="検索タイトルのみ";
strings["Search previous results"]               ="前の結果を検索";
strings["Display"]                               ="表示";
strings["No topics found!"]                      ="トピックが見つかりませんでした！ ";

strings["Type in the keyword to find:"]          ="検索するキーワードを入力します：";

strings["Show all"]                              ="すべて表示";
strings["Hide all"]                              ="すべて非表示";
strings["Previous"]                              ="前へ";
strings["Next"]                                  ="次へ";

strings["Loading table of contents..."]          ="ディレクトリを読み込んでいます... ";

strings["Topics:"]                               ="トピック";
strings["Current topic:"]                        ="現在のトピック：";
strings["Remove"]                                ="削除する";
strings["Add"]                                   ="追加する";

}else if(lang=='ko'){/////////////////////////////Korean///////////////////////////////////////////////

strings["Contents"]                              ="내용";
strings["Index"]                                 ="인덱스";
strings["Search"]                                ="검색";
strings["Bookmark"]                              ="서표";

strings["Loading the data for search..."]        ="검색 할 데이터로드 중 ...";
strings["Type in the word(s) to search for:"]    ="검색 할 단어를 입력하십시오 :";
strings["Search title only"]                     ="제목 만 검색";
strings["Search previous results"]               ="이전 결과 검색";
strings["Display"]                               ="디스플레이";
strings["No topics found!"]                      ="주제를 찾을 수 없습니다!";

strings["Type in the keyword to find:"]          ="찾을 수있는 키워드를 입력:";

strings["Show all"]                              ="모두 표시";
strings["Hide all"]                              ="모두 숨기기";
strings["Previous"]                              ="이전";
strings["Next"]                                  ="다음";

strings["Loading table of contents..."]          ="목차로드 중 ...";

strings["Topics:"]                               ="주제";
strings["Current topic:"]                        ="현재 주제 :";
strings["Remove"]                                ="지우다";
strings["Add"]                                   ="더하다";

}else if(lang=='cn'){//////////////////////////Chinese(Simplified)//////////////////////////////////////

strings["Contents"]                              ="目录";
strings["Index"]                                 ="索引";
strings["Search"]                                ="搜索";
strings["Bookmark"]                              ="书签";

strings["Loading the data for search..."]        ="正在加载要搜索的数据...";
strings["Type in the word(s) to search for:"]    ="输入要搜索的关键词：";
strings["Search title only"]                     ="仅搜索标题";
strings["Search previous results"]               ="在上次结果中搜索";
strings["Display"]                               ="显示";
strings["No topics found!"]                      ="找不到主题！";

strings["Type in the keyword to find:"]          ="键入要查找的关键字：";

strings["Show all"]                              ="显示所有";
strings["Hide all"]                              ="隐藏所有";
strings["Previous"]                              ="上一个";
strings["Next"]                                  ="下一个";

strings["Loading table of contents..."]          ="正在加载目录...";

strings["Topics:"]                               ="主题";
strings["Current topic:"]                        ="当前主题：";
strings["Remove"]                                ="删除";
strings["Add"]                                   ="添加";

}else if(lang=='zh'){//////////////////////////Chinese(Traditional)///////////////////////////////////////

strings["Contents"]                              ="目錄";
strings["Index"]                                 ="索引";
strings["Search"]                                ="搜索";
strings["Bookmark"]                              ="書籤";

strings["Loading the data for search..."]        ="正在加載要搜索的數據...";
strings["Type in the word(s) to search for:"]    ="輸入要搜索的關鍵詞：";
strings["Search title only"]                     ="只搜索標題";
strings["Search previous results"]               ="在上次結果中搜索";
strings["Display"]                               ="顯示";
strings["No topics found!"]                      ="找不到主題！";

strings["Type in the keyword to find:"]          ="鍵入要查找的關鍵字：";

strings["Show all"]                              ="顯示所有";
strings["Hide all"]                              ="隱藏所有";
strings["Previous"]                              ="上一個";
strings["Next"]                                  ="下一個";

strings["Loading table of contents..."]          ="正在加載目錄...";

strings["Topics:"]                               ="主題";
strings["Current topic:"]                        ="當前主題：";
strings["Remove"]                                ="刪除";
strings["Add"]                                   ="添加";


}else{//////////////////////////////////////English///////////////////////////////////////////////////

strings["Contents"]                              ="Contents";
strings["Index"]                                 ="Index";
strings["Search"]                                ="Search";
strings["Bookmark"]                              ="Bookmark";

strings["Loading the data for search..."]        ="Loading the data for search...";
strings["Type in the word(s) to search for:"]    ="Type in the word(s) to search for:";
strings["Search title only"]                     ="Search title only";
strings["Search previous results"]               ="Search previous results";
strings["Display"]                               ="Display";
strings["No topics found!"]                      ="No topics found!";

strings["Type in the keyword to find:"]          ="Type in the keyword to find:";

strings["Show all"]                              ="Show all";
strings["Hide all"]                              ="Hide all";
strings["Previous"]                              ="Previous";
strings["Next"]                                  ="Next";

strings["Loading table of contents..."]          ="Loading table of contents...";

strings["Topics:"]                               ="Topics";
strings["Current topic:"]                        ="Current topic:";
strings["Remove"]                                ="Remove";
strings["Add"]                                   ="Add";

}

