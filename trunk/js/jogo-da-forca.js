var prefs = new gadgets.Prefs();

var jogo = {
	URL : 'http://jogo-forca.appspot.com/',
	MAX_TENTATIVAS : 6,
	log : true,
	app : {},
	img : {
		icone : 'http://jogo-forca.appspot.com/favicon.ico',
		forca : '',
		atividade : {
			corpo : 'http://jogo-forca.appspot.com/img/atividade/corpo.png',
			forca1 : 'http://jogo-forca.appspot.com/img/atividade/forca1.png',
			forca2 : 'http://jogo-forca.appspot.com/img/atividade/forca2.png',
			triste : 'http://jogo-forca.appspot.com/img/atividade/triste.png',
			feliz : 'http://jogo-forca.appspot.com/img/atividade/feliz.png',
			logo : 'http://jogo-forca.appspot.com/img/atividade/logo.png'
		}
	},
	dominio : {
		GOOGLE : 'google.com',
		ORKUT : 'orkut.com'
	},
	sons : {
		ACERTO : 1,
		ERRO : 2,
		SUCESSO : 3,
		GAME_OVER : 4
	},
	som : true,
	tentativas : 0,
	pontuacao : {
		pontos : '0',
		salvos : '0',
		enforcados : '0'
	},
	palavra : '',
	numeroAmigos : 0,
	dono : null,
	visualizador : null,
	amigo : null,
	pontos : function() {
	},
	atividade : function() {
	}
};

jogo.app[jogo.dominio.GOOGLE] = 'http://www.google.com/ig/directory?url=jogo-forca.appspot.com/gadget.xml';
jogo.app[jogo.dominio.ORKUT] = '/Main#Application?appId=332749754900';

jogo._load = function() {
	var view = gadgets.views.getCurrentView().getName().toUpperCase();
	if (view == gadgets.views.ViewType.HOME || view == gadgets.views.ViewType.PROFILE) {
		if ($('#ir-para-jogo a').size() == 1) {
			$('#ir-para-jogo a').click(function() {
				gadgets.views.requestNavigateTo(new gadgets.views.View('canvas'));
			});
			$('#ir-para-jogo a').show();
		}
		
		var pontuacao = opensocial.data.DataContext.getDataSet('pontuacao');
		if (pontuacao && pontuacao.code == 500) {
			jogo.pontos.carregar();
		}
	}
	
	if (view == gadgets.views.ViewType.CANVAS) {
		jogo.carregarDados();

		$('#novo-jogo').click(jogo.novoJogo);
		if (opensocial.requestSendMessage) {
			$('#convidar').click(jogo.compartilhar);
			$('#convidar').show();
		}
		
		jogo.img.forca = $('#enforcado1').css('backgroundImage');
		window.setTimeout(jogo.animarPassaro, 60000);
	}
	
	gadgets.window.adjustHeight();
	
	var ga = new _IG_GA('UA-19177153-2');
	ga.reportPageview('/' + opensocial.getEnvironment().getDomain() + '/' + gadgets.views.getCurrentView().getName().toLowerCase());
};

jogo.desenharLetras = function(exibirLetras) {
	log('jogo.desenharLetras(exibirLetras=' + exibirLetras + ')')
	if (jogo.palavra == '') {
		jogo.mensagem.erro('erro_buscar_amigo', true);
		return;
	}

	$('#nome').html('');

	var palavras = jogo.palavra.split(' ');
	var palavra = '';
	var html = '';
	var cont = 0;

	for ( var i in palavras) {
		palavra = palavras[i];
		for ( var i = 0; i < palavra.length; i++) {
			var letra = exibirLetras ? palavra.charAt(i).toUpperCase() : '';
			html += '<div class="letra letra' + cont + ' branco">' + letra + '</div>';
			cont++;
		}

		$('#nome').append('<div class="linha">' + html + '</div>');
		html = '';
		cont++;
	}

	gadgets.window.adjustHeight();
};

jogo._keypress = function(evento) {
	evento = evento || window.event;
	var codigo = evento.keyCode ? evento.keyCode : evento.which;
	
	if (jogo.tentativas == jogo.MAX_TENTATIVAS || $('.branco').size() == 0 || codigo < 33) {
		return;
	}

	var tecla = String.fromCharCode(codigo).toUpperCase();
	if (evento.ctrlKey && tecla == 'E') {
		jogo.novoJogo();
		return false;
	}
	
	if (evento.ctrlKey && tecla == 'Q') {
		jogo.compartilhar();
		return false;
	}
	
	var digitado = false;
	$('.letra').each(function(indice, elemento) {
		if ($(elemento).html() == tecla) {
			digitado = true;
			return;
		}
	});

	if (digitado) {
		return;
	}

	var encontrou = false;
	for ( var i = 0; i < jogo.palavra.length; i++) {
		if (jogo.palavra.charAt(i).toUpperCase() == tecla) {
			$('.letra' + i).html(tecla);
			$('.letra' + i).removeClass('branco');
			$('.letra' + i).addClass('acerto');
			jogo.pontuacao.pontos = parseInt(jogo.pontuacao.pontos) + 1;
			encontrou = true;
		}
	}

	if (encontrou) {
		$('#pontos .pontuacao').html(jogo.pontuacao.pontos);
		$('#pontos').show();
		jogo.som(jogo.sons.ACERTO);
	} else {
		if (jogo.tentativas == 0) {
			$('#letras-digitadas').html('');
		}
		
		jogo.tentativas++;
		$('#enforcado' + jogo.tentativas).show();
		$('#letras-digitadas').append(tecla + ' - ');
		jogo.som(jogo.sons.ERRO);
	}

	if (jogo.tentativas == jogo.MAX_TENTATIVAS) {
		jogo.gameOver();
	}

	if ($('.branco').size() == 0) {
		jogo.sucesso();
	}
};

jogo.novoJogo = function() {
	log('jogo.novoJogo()');
	jogo.carregarNovoAmigo();
	jogo.tentativas = 0;

	$('.enforcado').hide();
	$('#letras-digitadas').html('');
	$('#sucesso').hide();
	$('#game-over').hide();
	$('.mensagem').hide();

	$('#enforcado1').css('backgroundImage', jogo.img.forca);
	gadgets.window.adjustHeight();
};

jogo.sucesso = function() {
	log('jogo.sucesso');
	jogo.pontuacao.salvos = parseInt(jogo.pontuacao.salvos) + 1;
	jogo.exibirMiniatura();
	$('#sucesso').show();
	jogo.som(jogo.sons.SUCESSO);
	gadgets.window.adjustHeight();
	
	jogo.pontos.salvar();
	jogo.atividade.criar(true);
};

jogo.gameOver = function() {
	log('jogo.gameOver()');
	jogo.pontuacao.enforcados = parseInt(jogo.pontuacao.enforcados) + 1;
	jogo.desenharLetras(true);
	jogo.exibirMiniatura();
	$('#game-over').show();
	jogo.som(jogo.sons.GAME_OVER);
	gadgets.window.adjustHeight();
	
	jogo.pontos.salvar();
	jogo.atividade.criar(false);
};

jogo.exibirMiniatura = function() {
	var miniatura = jogo.amigo.getField(opensocial.Person.Field.THUMBNAIL_URL);
	if (miniatura) {
		$('#enforcado1').css('backgroundImage', 'url("' + miniatura + '")');
	}
}

jogo.pontos.exibir = function() {
	log('jogo.pontos.exibir()');
	
	if (jogo.pontuacao.pontos && !isNaN(jogo.pontuacao.pontos)) {
		$('#pontos .pontuacao').html(jogo.pontuacao.pontos);
		$('#pontuacao').show();
		$('#pontos').show();
	}
	
	if (jogo.pontuacao.salvos && !isNaN(jogo.pontuacao.enforcados)) {
		$('#salvos .pontuacao').html(jogo.pontuacao.salvos);
		$('#enforcados .pontuacao').html(jogo.pontuacao.enforcados);
		$('#estatisticas').show();
	}
	
	gadgets.window.adjustHeight();
}

jogo.mensagem = function(tipo, mensagem, i18n, resposta) {
	log('jogo.mensagem(tipo=' + tipo + ', mensagem=' + mensagem + ', i18n=' + i18n + ')');
	$('.mensagem').hide();
	
	if ((typeof i18n) == 'boolean' && i18n) {
		mensagem = prefs.getMsg(mensagem);
	}
	
	if ((typeof mensagem) == 'string') {
		$('#container').append('<div class="mensagem ' + tipo + '">' + mensagem + '</div>');
	} else if ((typeof mensagem) == 'object') {
		jogo.mensagem.erroResposta(mensagem);
	}
	
	if (resposta) {
		jogo.mensagem.erroResposta(resposta);
	}
	
	gadgets.window.adjustHeight();
};

jogo.mensagem.erroResposta = function(resposta) {
	var mensagem = (resposta && resposta.getErrorMessage()) ? resposta.getErrorMessage() : prefs.getMsg('erro_indefinido');
	$('#container').append('<div class="mensagem erro">' + mensagem + '</div>');
}

jogo.mensagem.info = function(mensagem, i18n) {
	jogo.mensagem('info', mensagem, i18n);
};

jogo.mensagem.advertencia = function(mensagem, i18n) {
	jogo.mensagem('advertencia', mensagem, i18n);
};

jogo.mensagem.erro = function(mensagem, i18n, resposta) {
	jogo.mensagem('erro', mensagem, i18n, resposta);
};

jogo.recarregar = function() {
	log('jogo.recarregar()');
	window.location = window.location;
};

jogo.animarPassaro = function() {
	var largura = $(window).width() - 70;
	$("#passaro").show();
	$("#passaro").animate({ left: '+=' + largura + 'px' }, 10000, 'linear', function() {
		$("#passaro").hide();
		$("#passaro").css('left', 0);
		window.setTimeout(jogo.animarPassaro, 60000);
	});
}

jogo.som = function(som) {
}

function log(mensagem) {
	if (jogo.log && typeof console != 'undefined') {
		console.log(mensagem);
	}
}

function testar(tipo, campos) {
	if (tipo && campos) {
		var html = '';

		html += '<div class="mensagem" style="text-align: left;">';
		html += tipo.toUpperCase();
		html += '<ul>';
		for ( var i in campos) {
			html += '<li>' + i + ': ' + opensocial.getEnvironment().supportsField(tipo, campos[i]) + '</li>';
		}
		html += '</ul>';
		html += '</div>';

		$('#container').append(html);
	} else {
		testar(opensocial.Environment.ObjectType.ACTIVITY, opensocial.Activity.Field);
		// testar(opensocial.Environment.ObjectType.ACTIVITY_MEDIA_ITEM, opensocial.Activity.MediaItem.Field);
		testar(opensocial.Environment.ObjectType.ADDRESS, opensocial.Address.Field);
		testar(opensocial.Environment.ObjectType.BODY_TYPE, opensocial.BodyType.Field);
		testar(opensocial.Environment.ObjectType.EMAIL, opensocial.Email.Field);
		testar(opensocial.Environment.ObjectType.FILTER_TYPE, opensocial.DataRequest.FilterType);
		testar(opensocial.Environment.ObjectType.MESSAGE, opensocial.Message.Field);
		testar(opensocial.Environment.ObjectType.MESSAGE_TYPE, opensocial.Message.Type);
		testar(opensocial.Environment.ObjectType.NAME, opensocial.Name.Field);
		testar(opensocial.Environment.ObjectType.ORGANIZATION, opensocial.Organization.Field);
		testar(opensocial.Environment.ObjectType.PERSON, opensocial.Person.Field);
		testar(opensocial.Environment.ObjectType.PHONE, opensocial.Phone.Field);
		testar(opensocial.Environment.ObjectType.SORT_ORDER, opensocial.DataRequest.SortOrder);
		testar(opensocial.Environment.ObjectType.URL, opensocial.Url.Field);
	}
}

$(document).keypress(jogo._keypress);
gadgets.util.registerOnLoadHandler(jogo._load);