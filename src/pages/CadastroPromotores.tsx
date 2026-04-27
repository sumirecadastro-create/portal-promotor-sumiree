<h1>Cadastro de Promotores</h1>

<form action="/api/promotores" method="POST">
    <label>Nome do Promotor *</label>
    <input name="promotor_nome" required>

    <label>Loja *</label>
    <select name="loja_id" required>
        <option value="">Selecione...</option>
        <!-- carregar lista de lojas do banco -->
    </select>

    <label>Gerente Responsável *</label>
    <select name="gerente_id" required>
        <option value="">Selecione...</option>
        <!-- carregar lista de gerentes do banco -->
    </select>

    <label>Dias de Trabalho *</label>
    <input name="dias_semana" placeholder="Ex: Segunda a sábado" required>

    <label>Contato do Responsável</label>
    <input name="contato_responsavel" placeholder="Ex: Thiago - (11) 99999-9999">

    <button type="submit">Criar Promotor</button>
</form>
